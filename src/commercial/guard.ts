import {
  checkCachedLicense,
  saveCachedLicense,
  verifyLemonSqueezyLicense,
  verifyOfflineLicenseToken,
  LicenseVerificationResult
} from './license.js';

export class CommercialLicenseError extends Error {
  public code: string = 'ERR_COMMERCIAL_LICENSE_REQUIRED';

  constructor(message: string) {
    super(
      `[COMMERCIAL LICENSE ERROR] ${message}\n` +
      `Please provide a valid license key via --license <key> or set FIGMA_SPEC_LICENSE_KEY environment variable.\n` +
      `To purchase a Pro Lifetime License ($29), visit: https://creem.io`
    );
    this.name = 'CommercialLicenseError';
  }
}

export interface LicenseResolutionOptions {
  licenseKey?: string;
  cachePath?: string;
  fetchImpl?: typeof fetch;
  skipNetwork?: boolean;
}

/**
 * Resolves and verifies commercial license entitlement.
 * Throws CommercialLicenseError if unauthorized.
 */
export async function assertCommercialLicense(
  options: LicenseResolutionOptions = {}
): Promise<LicenseVerificationResult> {
  const key = options.licenseKey || process.env.FIGMA_SPEC_LICENSE_KEY;

  // 1. If key is provided and is an offline cryptographic token
  if (key && key.startsWith('FSPLIC.')) {
    const offlineRes = verifyOfflineLicenseToken(key);
    if (!offlineRes.valid) {
      throw new CommercialLicenseError(offlineRes.reason || 'Offline license verification failed.');
    }
    return offlineRes;
  }

  // 2. Check local machine cache first for rapid startup
  const cachedRes = checkCachedLicense(options.cachePath);
  if (cachedRes.valid) {
    return cachedRes;
  }

  // 3. If standard Lemon Squeezy license key is provided, perform online activation
  if (key) {
    if (options.skipNetwork) {
      throw new CommercialLicenseError('Network activation disabled and no valid local license cache found.');
    }

    const onlineRes = await verifyLemonSqueezyLicense(key, { fetchImpl: options.fetchImpl });
    if (onlineRes.valid) {
      // Save to cache upon successful verification
      try {
        saveCachedLicense(key, onlineRes.buyerId || 'customer', options.cachePath);
      } catch {
        // Cache write failure shouldn't block execution
      }
      return onlineRes;
    }

    throw new CommercialLicenseError(onlineRes.reason || 'License key validation failed.');
  }

  // 4. Missing license
  throw new CommercialLicenseError('No active commercial license found on this machine.');
}
