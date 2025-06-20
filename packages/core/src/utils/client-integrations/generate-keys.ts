import { randomBytes } from "@noble/hashes/utils.js";
import { scrypt } from "@noble/hashes/scrypt.js";
import { generateSecret } from "../helpers/index.js";
import constants from "../../constants/constants.js";

const generateKeys = async (
	encryptionKey: string,
): Promise<{
	key: string;
	apiKey: string;
	apiKeyHash: string;
	secret: string;
}> => {
	const apiKey = Buffer.from(randomBytes(32)).toString("hex");
	const { secret, encryptSecret } = generateSecret(encryptionKey);

	const apiKeyHash = Buffer.from(
		scrypt(apiKey, secret, constants.scrypt),
	).toString("base64");

	return {
		key: Buffer.from(randomBytes(3)).toString("hex"),
		apiKey: apiKey,
		apiKeyHash: apiKeyHash,
		secret: encryptSecret,
	};
};

export default generateKeys;
