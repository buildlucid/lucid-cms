import crypto from "node:crypto";
import type { ServiceContext } from "../../../utils/services/types.js";

const hashValue = (
	context: ServiceContext,
	purpose: "authorization-code" | "refresh-token" | "signing-key",
	value: string,
) =>
	crypto
		.createHmac("sha256", context.config.secrets.accessToken)
		.update(`lucid:oauth:${purpose}\0`, "utf8")
		.update(value, "utf8")
		.digest("hex");

/** Creates a cryptographically secure opaque OAuth token. */
export const createOAuthOpaqueToken = () =>
	crypto.randomBytes(32).toString("base64url");

/** Hashes an authorization code before persistence or lookup. */
export const hashOAuthAuthorizationCode = (
	context: ServiceContext,
	code: string,
) => hashValue(context, "authorization-code", code);

/** Hashes a refresh token before persistence or lookup. */
export const hashOAuthRefreshToken = (
	context: ServiceContext,
	refreshToken: string,
) => hashValue(context, "refresh-token", refreshToken);

/** Derives the OAuth signing key from the configured access-token secret. */
export const getOAuthSigningKey = (context: ServiceContext) =>
	hashValue(context, "signing-key", "v1");

/** Verifies an RFC 7636 S256 PKCE challenge in constant time. */
export const verifyPkce = (verifier: string, challenge: string) => {
	const actual = crypto.createHash("sha256").update(verifier, "ascii").digest();
	const expected = Buffer.from(challenge, "base64url");

	return (
		actual.byteLength === expected.byteLength &&
		crypto.timingSafeEqual(actual, expected)
	);
};
