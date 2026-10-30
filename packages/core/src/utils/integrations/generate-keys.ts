import { randomBytes } from "node:crypto";
import hashSecret from "../helpers/hash-secret.js";
import { generateSecret } from "../helpers/index.js";

/**
 * Generates the public and encrypted credentials for an integration.
 */
const generateKeys = async (
	encryptionKey: string,
): Promise<{
	key: string;
	apiKey: string;
	apiKeyHash: string;
	secret: string;
}> => {
	const apiKey = randomBytes(32).toString("hex");
	const { secret, encryptSecret } = generateSecret(encryptionKey);

	const apiKeyHash = await hashSecret(apiKey, secret);

	return {
		key: randomBytes(3).toString("hex"),
		apiKey: apiKey,
		apiKeyHash: apiKeyHash,
		secret: encryptSecret,
	};
};

export default generateKeys;
