import { randomBytes } from "node:crypto";
import type { ServiceContext } from "../services/types.js";
import hashApiKey from "./hash-api-key.js";

/** Generates integration credentials and the API key hash to store. */
const generateKeys = (
	context: ServiceContext,
): {
	key: string;
	apiKey: string;
	apiKeyHash: string;
} => {
	const apiKey = randomBytes(32).toString("hex");

	return {
		key: randomBytes(3).toString("hex"),
		apiKey: apiKey,
		apiKeyHash: hashApiKey(context, apiKey),
	};
};

export default generateKeys;
