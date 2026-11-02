import crypto from 'node:crypto';
/**
 * Creates an encrypted digital watermark token for a buyer.
 */
export function generateBuyerWatermark(buyerId, licenseKey, secretKey) {
    const payload = {
        buyerId,
        issuedAt: new Date().toISOString(),
        licenseHash: crypto.createHash('sha256').update(licenseKey).digest('hex').substring(0, 16)
    };
    const jsonStr = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secretKey).update(jsonStr).digest('hex');
    const encoded = Buffer.from(jsonStr, 'utf-8').toString('base64');
    return `FSP-WM.${encoded}.${hmac}`;
}
/**
 * Verifies and extracts the buyer watermark from a token string.
 */
export function verifyBuyerWatermark(watermarkToken, secretKey) {
    if (!watermarkToken || !watermarkToken.startsWith('FSP-WM.')) {
        return null;
    }
    const parts = watermarkToken.split('.');
    if (parts.length !== 3) {
        return null;
    }
    const [prefix, encodedPayload, expectedHmac] = parts;
    try {
        const jsonStr = Buffer.from(encodedPayload, 'base64').toString('utf-8');
        const computedHmac = crypto.createHmac('sha256', secretKey).update(jsonStr).digest('hex');
        // Timing-safe comparison to prevent side-channel attacks
        const expectedBuf = Buffer.from(expectedHmac, 'hex');
        const computedBuf = Buffer.from(computedHmac, 'hex');
        if (expectedBuf.length !== computedBuf.length || !crypto.timingSafeEqual(expectedBuf, computedBuf)) {
            return null;
        }
        return JSON.parse(jsonStr);
    }
    catch {
        return null;
    }
}
