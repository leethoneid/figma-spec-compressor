import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  getMachineFingerprint,
  generateBuyerWatermark,
  verifyBuyerWatermark,
  generateOfflineLicenseToken,
  verifyOfflineLicenseToken,
  checkCachedLicense,
  saveCachedLicense,
  assertCommercialLicense,
  CommercialLicenseError
} from '../src/commercial/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tempDir = path.join(os.tmpdir(), `figma-spec-test-${Date.now()}`);

describe('Commercial Hardening & Anti-Piracy Suite', () => {

  test('getMachineFingerprint should return consistent 32-char hex hardware hash', () => {
    const fp1 = getMachineFingerprint();
    const fp2 = getMachineFingerprint();
    assert.equal(fp1.length, 32);
    assert.equal(fp1, fp2, 'Fingerprint must be deterministic on the same machine');
    assert.match(fp1, /^[0-9a-f]{32}$/);
  });

  test('generateBuyerWatermark should sign and verify buyer identity, and reject tampered tokens', () => {
    const secret = 'test-secret-key-12345';
    const watermark = generateBuyerWatermark('buyer_john_doe_99', 'LIC-PRO-10029', secret);
    assert.ok(watermark.startsWith('FSP-WM.'));

    // Valid verification
    const verified = verifyBuyerWatermark(watermark, secret);
    assert.ok(verified);
    assert.equal(verified?.buyerId, 'buyer_john_doe_99');

    // Wrong secret verification
    const wrongSecret = verifyBuyerWatermark(watermark, 'different-secret');
    assert.equal(wrongSecret, null);

    // Tampered token verification (corrupt base64 payload)
    const tampered = watermark.slice(0, 10) + 'X' + watermark.slice(11);
    assert.equal(verifyBuyerWatermark(tampered, secret), null);
  });

  test('verifyOfflineLicenseToken should authenticate valid token, block expired, and lock to machine ID', () => {
    const { publicKey: testPubKey, privateKey: testPrivKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    const currentMachine = getMachineFingerprint();

    // 1. Valid non-expired license locked to current machine
    const validToken = generateOfflineLicenseToken(
      {
        licenseKey: 'PRO-2026-ABCD',
        buyerId: 'customer@acme.com',
        machineId: currentMachine,
        expiresAt: 'never',
        issuedAt: new Date().toISOString()
      },
      testPrivKey
    );

    const validRes = verifyOfflineLicenseToken(validToken, { publicKey: testPubKey });
    assert.equal(validRes.valid, true);
    assert.equal(validRes.buyerId, 'customer@acme.com');

    // 2. Token locked to a DIFFERENT machine fingerprint must be rejected
    const foreignToken = generateOfflineLicenseToken(
      {
        licenseKey: 'PRO-2026-PIRATED',
        buyerId: 'hacker@torrent.org',
        machineId: '0123456789abcdef0123456789abcdef', // Different machine
        expiresAt: 'never',
        issuedAt: new Date().toISOString()
      },
      testPrivKey
    );

    const foreignRes = verifyOfflineLicenseToken(foreignToken, { publicKey: testPubKey });
    assert.equal(foreignRes.valid, false);
    assert.ok(foreignRes.reason?.includes('locked to a different device'));

    // 3. Expired license token
    const expiredToken = generateOfflineLicenseToken(
      {
        licenseKey: 'PRO-EXPIRED',
        buyerId: 'expired@customer.com',
        expiresAt: '2020-01-01T00:00:00.000Z',
        issuedAt: '2019-01-01T00:00:00.000Z'
      },
      testPrivKey
    );

    const expiredRes = verifyOfflineLicenseToken(expiredToken, { publicKey: testPubKey });
    assert.equal(expiredRes.valid, false);
    assert.ok(expiredRes.reason?.includes('License expired'));

    // 4. Tampered token signature
    const parts = validToken.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.badhmac1234567890`;
    const tamperedRes = verifyOfflineLicenseToken(tamperedToken, { publicKey: testPubKey });
    assert.equal(tamperedRes.valid, false);
    assert.ok(tamperedRes.reason?.includes('tampered with'));
  });

  test('saveCachedLicense and checkCachedLicense should enforce offline grace period and detect hardware spoofing', () => {
    fs.mkdirSync(tempDir, { recursive: true });
    const testCachePath = path.join(tempDir, 'license-cache.json');

    // 1. Initially no cache
    const initialRes = checkCachedLicense(testCachePath);
    assert.equal(initialRes.valid, false);

    // 2. Save valid activation
    saveCachedLicense('LIC-KEY-999', 'indie_dev@studio.io', testCachePath);
    const cachedRes = checkCachedLicense(testCachePath, 14);
    assert.equal(cachedRes.valid, true);
    assert.equal(cachedRes.buyerId, 'indie_dev@studio.io');
    assert.ok(cachedRes.offlineGraceDaysRemaining !== undefined && cachedRes.offlineGraceDaysRemaining <= 14);

    // 3. Test tampered cache file
    const rawCache = JSON.parse(fs.readFileSync(testCachePath, 'utf-8'));
    rawCache.buyerId = 'pirate@reseller.com'; // Unauthorized modification
    fs.writeFileSync(testCachePath, JSON.stringify(rawCache), 'utf-8');

    const tamperedRes = checkCachedLicense(testCachePath);
    assert.equal(tamperedRes.valid, false);
    assert.ok(tamperedRes.reason?.includes('Cache tampered with'));

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('assertCommercialLicense should throw CommercialLicenseError when license is missing or invalid', async () => {
    const dummyCache = path.join(os.tmpdir(), `nonexistent-cache-${Date.now()}.json`);

    // Missing license
    await assert.rejects(
      async () => {
        await assertCommercialLicense({
          licenseKey: undefined,
          cachePath: dummyCache,
          skipNetwork: true
        });
      },
      (err: any) => {
        assert.ok(err instanceof CommercialLicenseError);
        assert.ok(err.message.includes('COMMERCIAL LICENSE ERROR'));
        return true;
      }
    );
  });

  test('buildCommercialRelease should produce obfuscated, single-file commercial artifact', () => {
    const buildScript = path.join(__dirname, '..', 'scripts', 'build-commercial.ts');
    const res = spawnSync(process.execPath, ['--import', 'tsx', buildScript], {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf-8'
    });

    assert.equal(res.status, 0, `Commercial build failed: ${res.stderr || res.stdout}`);
    assert.ok(res.stdout.includes('Commercial release artifacts generated successfully'));

    const releaseBin = path.join(__dirname, '..', 'release-commercial', 'bin', 'figma-spec-pro.cjs');
    assert.ok(fs.existsSync(releaseBin), 'Hardened commercial binary must exist');

    const binContent = fs.readFileSync(releaseBin, 'utf-8');
    // Verify that the code is heavily obfuscated and doesn't expose plaintext function signatures
    assert.ok(binContent.includes('_0x'), 'Must contain obfuscated identifiers');
    assert.ok(!binContent.includes('export function extractFigmaNode'), 'Plaintext TypeScript exports must be stripped');

    // Run the obfuscated binary to test license check gate
    const runRes = spawnSync(process.execPath, [releaseBin, 'url', 'https://figma.com/file/Test123'], {
      encoding: 'utf-8'
    });
    // Must exit with error because no license was provided
    assert.equal(runRes.status, 1);
    assert.ok(runRes.stdout.includes('COMMERCIAL LICENSE ERROR') || runRes.stderr.includes('COMMERCIAL LICENSE ERROR'));

    // Verify activate command in obfuscated binary
    const secretPath = path.resolve(__dirname, '..', '.secrets', 'commercial-signer.private.pem');
    const hasSigningKey = Boolean(process.env.COMMERCIAL_SIGNER_PRIVATE_KEY || fs.existsSync(secretPath));

    if (hasSigningKey) {
      const validOfflineToken = generateOfflineLicenseToken({
        licenseKey: 'PRO-TEST-KEY',
        buyerId: 'verified-buyer@solo.dev',
        machineId: getMachineFingerprint(),
        expiresAt: 'never',
        issuedAt: new Date().toISOString()
      });

      const activateRes = spawnSync(process.execPath, [releaseBin, 'activate', validOfflineToken], {
        encoding: 'utf-8'
      });
      assert.equal(activateRes.status, 0);
      assert.ok(activateRes.stdout.includes('License activated for: verified-buyer@solo.dev'));
    } else {
      // In a clean checkout / CI without private keys, verify anti-piracy gate rejects malformed tokens
      const invalidRes = spawnSync(process.execPath, [releaseBin, 'activate', 'FSPLIC.invalid.token'], {
        encoding: 'utf-8'
      });
      assert.equal(invalidRes.status, 1);
      assert.ok(invalidRes.stdout.includes('COMMERCIAL LICENSE ERROR') || invalidRes.stderr.includes('COMMERCIAL LICENSE ERROR'));
    }
  });

});
