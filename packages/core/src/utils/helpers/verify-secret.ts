import { timingSafeEqual } from "node:crypto";
import hashSecret from "./hash-secret.js";

/** Checks a password against its stored `hashSecret` hash, comparing in constant time. */
const verifySecret = async (
	value: string,
	salt: string,
	hash: string,
): Promise<boolean> => {
	const actual = Buffer.from(await hashSecret(value, salt));
	const expected = Buffer.from(hash);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export default verifySecret;
