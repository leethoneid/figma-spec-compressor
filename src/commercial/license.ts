import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { getMachineFingerprint } from './machine-id.js';

export interface LicensePayload {
  licenseKey: string;
  buyerId: string;
  machineId?: string; // If bound to specific machine
  seats?: number;
  expiresAt?: string; // ISO date or 'never'
  issuedAt: string;
}

export interface LicenseVerificationResult {
  valid: boolean;
  buyerId?: string;
  reason?: string;
  offlineGraceDaysRemaining?: number;
}

export interface CachedLicenseData {
  licenseKey: string;
  buyerId: string;
  machineId: string;
  verifiedAt: string;
  signature: string;
}

const DEFAULT_SECRET = process.env.COMMERCIAL_SIGNER_SECRET || 'figma-spec-dev-signer-key-local';

export function getCacheFilePath(): string {
  const dir = path.join(os.homedir(), '.figma-spec');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'license-cache.json');
}

/**
 * Generates an offline cryptographically signed commercial license token.
 */
export function generateOfflineLicenseToken(
  payload: LicensePayload,
  secretKey: string = DEFAULT_SECRET
): string {
  const jsonStr = JSON.stringify(payload);
  const encoded = Buffer.from(jsonStr, 'utf-8').toString('base64');
  const hmac = crypto.createHmac('sha256', secretKey).update(encoded).digest('hex');
  return `FSPLIC.${encoded}.${hmac}`;
}

/**
 * Verifies an offline cryptographic license token against the current machine fingerprint.
 */
export function verifyOfflineLicenseToken(
  token: string,
  options?: { secretKey?: string; expectedMachineId?: string }
): LicenseVerificationResult {
  if (!token || !token.startsWith('FSPLIC.')) {
    return { valid: false, reason: 'Invalid license format. Expected FSPLIC.* token.' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'Malformed license token segments.' };
  }

  const [prefix, encodedPayload, expectedHmac] = parts;
  const secretKey = options?.secretKey || DEFAULT_SECRET;

  try {
    const computedHmac = crypto.createHmac('sha256', secretKey).update(encodedPayload).digest('hex');
    const expectedBuf = Buffer.from(expectedHmac, 'hex');
    const computedBuf = Buffer.from(computedHmac, 'hex');

    if (expectedBuf.length !== computedBuf.length || !crypto.timingSafeEqual(expectedBuf, computedBuf)) {
      return { valid: false, reason: 'License signature verification failed. Token was tampered with.' };
    }

    const payload: LicensePayload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf-8'));

    // Check expiration
    if (payload.expiresAt && payload.expiresAt !== 'never') {
      const expTime = new Date(payload.expiresAt).getTime();
      if (Date.now() > expTime) {
        return { valid: false, reason: `License expired on ${payload.expiresAt}.` };
      }
    }

    // Check machine binding if payload specifies a bound machine
    const currentMachineId = options?.expectedMachineId || getMachineFingerprint();
    if (payload.machineId && payload.machineId !== currentMachineId) {
      return {
        valid: false,
        reason: `License is locked to a different device. Bound: ${payload.machineId.substring(0, 8)}..., Current: ${currentMachineId.substring(0, 8)}...`
      };
    }

    return {
      valid: true,
      buyerId: payload.buyerId
    };
  } catch (err: any) {
    return { valid: false, reason: `License parse error: ${err?.message || err}` };
  }
}

/**
 * Validates a Merchant of Record (Creem / Lemon Squeezy) standard license key via activation API.
 */
export async function verifyMoRLicense(
  licenseKey: string,
  options?: {
    instanceName?: string;
    fetchImpl?: typeof fetch;
    apiUrl?: string;
  }
): Promise<LicenseVerificationResult> {
  const instanceName = options?.instanceName || os.hostname();
  const fetcher = options?.fetchImpl || fetch;
  const url = options?.apiUrl || process.env.CREEM_API_URL || process.env.MOR_API_URL || 'https://api.creem.io/v1/licenses/activate';

  try {
    const res = await fetcher(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        license_key: licenseKey,
        instance_name: instanceName
      })
    });

    const data: any = await res.json();
    if (data?.activated === true || data?.valid === true) {
      return {
        valid: true,
        buyerId: data?.meta?.customer_email || data?.customer_email || data?.license_key?.user_name || 'verified-customer'
      };
    }

    return {
      valid: false,
      reason: data?.error || 'Invalid or exhausted license key.'
    };
  } catch (err: any) {
    return {
      valid: false,
      reason: `MoR license activation failure: ${err?.message || err}`
    };
  }
}

export const verifyLemonSqueezyLicense = verifyMoRLicense;

/**
 * Checks local activation cache. If valid and verified within 14 days on the same machine, grants access.
 */
export function checkCachedLicense(
  cachePath: string = getCacheFilePath(),
  maxDays: number = 14
): LicenseVerificationResult {
  try {
    if (!fs.existsSync(cachePath)) {
      return { valid: false, reason: 'No cached activation found.' };
    }

    const raw = fs.readFileSync(cachePath, 'utf-8');
    const cached: CachedLicenseData = JSON.parse(raw);

    const currentMachine = getMachineFingerprint();
    if (cached.machineId !== currentMachine) {
      return { valid: false, reason: 'Cache invalidated: hardware signature mismatch.' };
    }

    // Verify cache integrity HMAC
    const expectedSig = crypto
      .createHmac('sha256', DEFAULT_SECRET)
      .update(`${cached.licenseKey}|${cached.buyerId}|${cached.machineId}|${cached.verifiedAt}`)
      .digest('hex');

    if (cached.signature !== expectedSig) {
      return { valid: false, reason: 'Cache tampered with.' };
    }

    const verifiedTimestamp = new Date(cached.verifiedAt).getTime();
    const elapsedDays = (Date.now() - verifiedTimestamp) / (1000 * 60 * 60 * 24);

    if (elapsedDays > maxDays) {
      return { valid: false, reason: 'Offline grace period expired. Re-verification required.' };
    }

    return {
      valid: true,
      buyerId: cached.buyerId,
      offlineGraceDaysRemaining: Math.max(0, Math.round(maxDays - elapsedDays))
    };
  } catch {
    return { valid: false, reason: 'Failed to read cache.' };
  }
}

/**
 * Saves a validated activation into local cache with machine binding.
 */
export function saveCachedLicense(
  licenseKey: string,
  buyerId: string,
  cachePath: string = getCacheFilePath()
): void {
  const machineId = getMachineFingerprint();
  const verifiedAt = new Date().toISOString();

  const signature = crypto
    .createHmac('sha256', DEFAULT_SECRET)
    .update(`${licenseKey}|${buyerId}|${machineId}|${verifiedAt}`)
    .digest('hex');

  const data: CachedLicenseData = {
    licenseKey,
    buyerId,
    machineId,
    verifiedAt,
    signature
  };

  fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
}
