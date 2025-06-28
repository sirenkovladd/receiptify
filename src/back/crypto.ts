import { webcrypto } from "node:crypto";
import { secretKeyHex } from "./config";

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // Recommended length for AES-GCM in bytes.

// The key is derived once and reused for performance.
let cryptoKey: webcrypto.CryptoKey;

/**
 * Imports the raw key from environment variables into a CryptoKey object
 * that the Web Crypto API can use.
 */
async function getKey(): Promise<webcrypto.CryptoKey> {
	if (cryptoKey) {
		return cryptoKey;
	}
	// Using crypto.subtle.importKey to create a CryptoKey.
	// 'raw' format expects a buffer with the key material.
	// We assume the ENCRYPTION_KEY is a hex string of a 256-bit (32-byte) key.
	cryptoKey = await webcrypto.subtle.importKey(
		"raw",
		secretKeyHex,
		{ name: ALGORITHM },
		true, // The key is extractable, though we don't use it here.
		["encrypt", "decrypt"],
	);
	return cryptoKey;
}
getKey();

/**
 * Encrypts a string using AES-GCM.
 * A new random IV is generated for each encryption and prepended to the ciphertext.
 * @param data The plaintext string to encrypt.
 * @returns A promise that resolves to a base64url encoded string of "iv:ciphertext".
 */
export async function encrypt(data: string): Promise<string> {
	const key = await getKey();
	// For AES-GCM, the IV must be unique for every encryption with the same key.
	const iv = webcrypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const encodedData = new TextEncoder().encode(data);

	const encryptedData = await webcrypto.subtle.encrypt(
		{
			name: ALGORITHM,
			iv: iv,
		},
		key,
		encodedData,
	);

	// Prepend the IV to the ciphertext. The receiver will need it for decryption.
	const ivAndCiphertext = new Uint8Array(iv.length + encryptedData.byteLength);
	ivAndCiphertext.set(iv);
	ivAndCiphertext.set(new Uint8Array(encryptedData), iv.length);

	// Return as a URL-safe base64 string, suitable for cookies or URLs.
	return Buffer.from(ivAndCiphertext).toString("base64url");
}

/**
 * Decrypts a string that was encrypted with the `encrypt` function.
 * @param encryptedData The base64url encoded string of "iv:ciphertext".
 * @returns A promise that resolves to the decrypted plaintext string.
 */
export async function decrypt(encryptedData: string): Promise<string> {
	const key = await getKey();
	const ivAndCiphertext = Buffer.from(encryptedData, "base64url");

	const iv = ivAndCiphertext.slice(0, IV_LENGTH);
	const ciphertext = ivAndCiphertext.slice(IV_LENGTH);

	const decryptedData = await webcrypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);

	return new TextDecoder().decode(decryptedData);
}