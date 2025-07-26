const getEnvVariable = (name: string, defaultValue?: string): string => {
	const value = process.env[name];
	if (value) {
		return value;
	}
	if (defaultValue === undefined) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return defaultValue;
};

export const GEMINI_API_KEY = getEnvVariable("GEMINI_API_KEY");
export const PREDICTION_MODEL = getEnvVariable(
	"PREDICTION_MODEL",
	"gemini-1.5-flash",
);

const preSecretKeyHex = getEnvVariable("ENCRYPTION_KEY");
export const secretKeyHex = Buffer.from(preSecretKeyHex, "base64url");

if (secretKeyHex.length !== 32) {
	throw new Error(
		`ENCRYPTION_KEY environment variable must be a 32-byte key, but it is ${secretKeyHex.length} bytes long.`,
	);
}
