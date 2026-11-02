import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { getMachineFingerprint } from './machine-id.js';
export const DEFAULT_GUMROAD_PRODUCT_ID = 'VALWkRvdZllugPWQadSyLw==';
export const DEFAULT_GUMROAD_PERMALINK = 'figma-spec-pro';
/**
 * Derives a deterministic machine-bound HMAC key for securing local activation caches.
 * Prevents transferring cache files across machines or manual JSON tampering.
 */
export function getLocalCacheHmacKey() {
    return crypto.createHash('sha256').update(`fsp-cache-hw-salt:${getMachineFingerprint()}`).digest('hex');
}
export function getCacheFilePath() {
    const dir = path.join(os.homedir(), '.figma-spec');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'license-cache.json');
}
/**
 * Generates an offline cryptographically signed commercial license token.
 * Requires an explicit secretKey or COMMERCIAL_SIGNER_SECRET environment variable.
 */
export function generateOfflineLicenseToken(payload, secretKey) {
    const secret = secretKey || process.env.COMMERCIAL_SIGNER_SECRET;
    if (!secret) {
        throw new Error('COMMERCIAL_SIGNER_SECRET environment variable or explicit secretKey is required to sign offline license tokens.');
    }
    const jsonStr = JSON.stringify(payload);
    const encoded = Buffer.from(jsonStr, 'utf-8').toString('base64');
    const hmac = crypto.createHmac('sha256', secret).update(encoded).digest('hex');
    return `FSPLIC.${encoded}.${hmac}`;
}
/**
 * Verifies an offline cryptographic license token against the current machine fingerprint.
 */
export function verifyOfflineLicenseToken(token, options) {
    if (!token || !token.startsWith('FSPLIC.')) {
        return { valid: false, reason: 'Invalid license format. Expected FSPLIC.* token.' };
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
        return { valid: false, reason: 'Malformed license token segments.' };
    }
    const [prefix, encodedPayload, expectedHmac] = parts;
    const secretKey = options?.secretKey || process.env.COMMERCIAL_SIGNER_SECRET;
    if (!secretKey) {
        return { valid: false, reason: 'Offline verification unavailable: no signing key configured.' };
    }
    try {
        const computedHmac = crypto.createHmac('sha256', secretKey).update(encodedPayload).digest('hex');
        const expectedBuf = Buffer.from(expectedHmac, 'hex');
        const computedBuf = Buffer.from(computedHmac, 'hex');
        if (expectedBuf.length !== computedBuf.length || !crypto.timingSafeEqual(expectedBuf, computedBuf)) {
            return { valid: false, reason: 'License signature verification failed. Token was tampered with.' };
        }
        const payload = JSON.parse(Buffer.from(encodedPayload, 'base64').toString('utf-8'));
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
    }
    catch (err) {
        return { valid: false, reason: `License parse error: ${err?.message || err}` };
    }
}
/**
 * Validates a Gumroad commercial license key via Gumroad verification API.
 */
export async function verifyGumroadLicense(licenseKey, options) {
    const fetcher = options?.fetchImpl || fetch;
    const url = options?.apiUrl || 'https://api.gumroad.com/v2/licenses/verify';
    const productId = options?.productId || process.env.GUMROAD_PRODUCT_ID || DEFAULT_GUMROAD_PRODUCT_ID;
    try {
        const params = new URLSearchParams({
            product_id: productId,
            license_key: licenseKey.trim(),
            increment_uses_count: options?.incrementUses !== false ? 'true' : 'false'
        });
        const res = await fetcher(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });
        const data = await res.json();
        if (data?.success === true && data?.purchase) {
            if (data.purchase.refunded || data.purchase.chargebacked) {
                return {
                    valid: false,
                    reason: 'License key has been refunded or chargebacked.'
                };
            }
            return {
                valid: true,
                buyerId: data.purchase.email || 'gumroad-customer'
            };
        }
        return {
            valid: false,
            reason: data?.message || 'Invalid or revoked Gumroad license key.'
        };
    }
    catch (err) {
        return {
            valid: false,
            reason: `Gumroad license verification network failure: ${err?.message || err}`
        };
    }
}
export const verifyMoRLicense = verifyGumroadLicense;
export const verifyLemonSqueezyLicense = verifyGumroadLicense;
/**
 * Checks local activation cache. If valid and verified within 14 days on the same machine, grants access.
 */
export function checkCachedLicense(cachePath = getCacheFilePath(), maxDays = 14) {
    try {
        if (!fs.existsSync(cachePath)) {
            return { valid: false, reason: 'No cached activation found.' };
        }
        const raw = fs.readFileSync(cachePath, 'utf-8');
        const cached = JSON.parse(raw);
        const currentMachine = getMachineFingerprint();
        if (cached.machineId !== currentMachine) {
            return { valid: false, reason: 'Cache invalidated: hardware signature mismatch.' };
        }
        // Verify cache integrity HMAC using local machine-derived key
        const expectedSig = crypto
            .createHmac('sha256', getLocalCacheHmacKey())
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
    }
    catch {
        return { valid: false, reason: 'Failed to read cache.' };
    }
}
/**
 * Saves a validated activation into local cache with machine binding.
 */
export function saveCachedLicense(licenseKey, buyerId, cachePath = getCacheFilePath()) {
    const machineId = getMachineFingerprint();
    const verifiedAt = new Date().toISOString();
    const signature = crypto
        .createHmac('sha256', getLocalCacheHmacKey())
        .update(`${licenseKey}|${buyerId}|${machineId}|${verifiedAt}`)
        .digest('hex');
    const data = {
        licenseKey,
        buyerId,
        machineId,
        verifiedAt,
        signature
    };
    fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf-8');
}
