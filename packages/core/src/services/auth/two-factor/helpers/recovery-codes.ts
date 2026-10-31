import crypto from "node:crypto";
import constants from "../../../../constants/constants.js";
import type { ServiceContext } from "../../../../utils/services/types.js";

//* Crockford's base32 leaves out i, l, o and u, so codes are easy to read back
const alphabet = "0123456789abcdefghjkmnpqrstvwxyz";
const { recoveryCodeCount, recoveryCodeLength } = constants.twoFactor;

/** Creates a new set of recovery codes, like `k7m2q-x9p4w`. */
export const generateRecoveryCodes = () =>
	Array.from({ length: recoveryCodeCount }, () => {
		//* 256 is a multiple of 32, so every character is equally likely
		const characters = Array.from(
			crypto.randomBytes(recoveryCodeLength),
			(byte) => alphabet[byte % alphabet.length],
		).join("");
		const half = recoveryCodeLength / 2;
		return `${characters.slice(0, half)}-${characters.slice(half)}`;
	});

/**
 * Hashes a recovery code with the encryption secret, so a copy of the database
 * alone can't be used. Case, spaces, dashes and lookalike letters are ignored.
 */
export const hashRecoveryCode = (context: ServiceContext, code: string) => {
	const normalized = code
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "")
		.replace(/[il]/g, "1")
		.replace(/o/g, "0");

	return crypto
		.createHmac("sha256", context.config.secrets.encryption)
		.update("lucid-two-factor:recovery-code\0", "utf8")
		.update(normalized, "utf8")
		.digest("hex");
};
