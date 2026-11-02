export interface BuyerWatermark {
    buyerId: string;
    issuedAt: string;
    licenseHash: string;
}
/**
 * Creates an encrypted digital watermark token for a buyer.
 */
export declare function generateBuyerWatermark(buyerId: string, licenseKey: string, secretKey: string): string;
/**
 * Verifies and extracts the buyer watermark from a token string.
 */
export declare function verifyBuyerWatermark(watermarkToken: string, secretKey: string): BuyerWatermark | null;
