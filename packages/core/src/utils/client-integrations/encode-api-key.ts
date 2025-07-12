/**
 * Encodes the api key and key into a base64 string
 */
export const encodeApiKey = (key: string, apiKey: string) =>
	Buffer.from(`${key}:${apiKey}`).toString("base64");

/**
 * Decodes the api key and key from a base64 string
 */
export const decodeApiKey = (encodedKey: string) => {
	const decoded = Buffer.from(encodedKey, "base64").toString("utf-8");
	const [key, apiKey] = decoded.split(":");
	return { key, apiKey };
};
