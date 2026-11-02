export interface LicensePayload {
    licenseKey: string;
    buyerId: string;
    machineId?: string;
    seats?: number;
    expiresAt?: string;
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
export declare const DEFAULT_GUMROAD_PRODUCT_ID = "VALWkRvdZllugPWQadSyLw==";
export declare const DEFAULT_GUMROAD_PERMALINK = "figma-spec-pro";
/**
 * Derives a deterministic machine-bound HMAC key for securing local activation caches.
 * Prevents transferring cache files across machines or manual JSON tampering.
 */
export declare function getLocalCacheHmacKey(): string;
export declare function getCacheFilePath(): string;
/**
 * Generates an offline cryptographically signed commercial license token.
 * Requires an explicit secretKey or COMMERCIAL_SIGNER_SECRET environment variable.
 */
export declare function generateOfflineLicenseToken(payload: LicensePayload, secretKey?: string): string;
/**
 * Verifies an offline cryptographic license token against the current machine fingerprint.
 */
export declare function verifyOfflineLicenseToken(token: string, options?: {
    secretKey?: string;
    expectedMachineId?: string;
}): LicenseVerificationResult;
/**
 * Validates a Gumroad commercial license key via Gumroad verification API.
 */
export declare function verifyGumroadLicense(licenseKey: string, options?: {
    productId?: string;
    productPermalink?: string;
    fetchImpl?: typeof fetch;
    apiUrl?: string;
    incrementUses?: boolean;
}): Promise<LicenseVerificationResult>;
export declare const verifyMoRLicense: typeof verifyGumroadLicense;
export declare const verifyLemonSqueezyLicense: typeof verifyGumroadLicense;
/**
 * Checks local activation cache. If valid and verified within 14 days on the same machine, grants access.
 */
export declare function checkCachedLicense(cachePath?: string, maxDays?: number): LicenseVerificationResult;
/**
 * Saves a validated activation into local cache with machine binding.
 */
export declare function saveCachedLicense(licenseKey: string, buyerId: string, cachePath?: string): void;
