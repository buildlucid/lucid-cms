export const integrationApiKeyPrefix = "lucid_int_";

/**
 * Encodes an integration credential using a recognizable, header-safe prefix.
 */
export const encodeApiKey = (key: string, apiKey: string) =>
	`${integrationApiKeyPrefix}${Buffer.from(`${key}:${apiKey}`).toString("base64url")}`;

/**
 * Decodes a prefixed integration credential.
 */
export const decodeApiKey = (encodedKey: string) => {
	if (!encodedKey.startsWith(integrationApiKeyPrefix)) {
		return { key: undefined, apiKey: undefined };
	}

	const payload = encodedKey.slice(integrationApiKeyPrefix.length);
	if (!payload || !/^[A-Za-z0-9_-]+$/.test(payload)) {
		return { key: undefined, apiKey: undefined };
	}

	const decoded = Buffer.from(payload, "base64url").toString("utf-8");
	const parts = decoded.split(":");
	if (parts.length !== 2) {
		return { key: undefined, apiKey: undefined };
	}

	const [key, apiKey] = parts;
	if (!key || !apiKey) {
		return { key: undefined, apiKey: undefined };
	}

	return { key, apiKey };
};
