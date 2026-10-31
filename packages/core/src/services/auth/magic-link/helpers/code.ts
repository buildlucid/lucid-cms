import crypto from "node:crypto";
import constants from "../../../../constants/constants.js";
import type { ServiceContext } from "../../../../utils/services/types.js";

/** Creates the numeric code emailed alongside a magic link. */
export const generateMagicLinkCode = () =>
	crypto
		.randomInt(0, 10 ** constants.magicLink.codeLength)
		.toString()
		.padStart(constants.magicLink.codeLength, "0");

/** Hashes a code with the encryption secret, so a copy of the database alone can't be used to guess it. */
export const hashMagicLinkCode = (context: ServiceContext, code: string) =>
	crypto
		.createHmac("sha256", context.config.secrets.encryption)
		.update("lucid-magic-link:code\0", "utf8")
		.update(code, "utf8")
		.digest("hex");

/** Compares an entered code with a magic link's stored hash in constant time. */
export const magicLinkCodeMatches = (
	context: ServiceContext,
	code: string,
	hash: string | null,
) => {
	if (!hash) return false;

	const actual = Buffer.from(hashMagicLinkCode(context, code), "hex");
	const expected = Buffer.from(hash, "hex");
	return (
		actual.length === expected.length &&
		crypto.timingSafeEqual(actual, expected)
	);
};
