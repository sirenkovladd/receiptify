export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const DB_URL = process.env.DB_URL;
export const PREDICTION_MODEL = process.env.PREDICTION_MODEL;

// It's crucial to have this in your .env file.
// A 256-bit key is a 64-character hex string.
// You can generate one with: openssl rand -hex 32
const preSecretKeyHex = process.env.ENCRYPTION_KEY || '';
export const secretKeyHex = Buffer.from(preSecretKeyHex, "base64url");
if (secretKeyHex.length !== 32) {
  
  throw new Error(
    `ENCRYPTION_KEY environment variable must be set and be a 32-byte (${secretKeyHex.length})`,
  );
}
