import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ServiceContext } from "../../../utils/services/types.js";

export const oauthClientIdPrefix = "lucid_oauth_";
export const oauthClientSecretPrefix = "lucid_oauth_secret_";

export const createOAuthClientId = () =>
	`${oauthClientIdPrefix}${randomBytes(12).toString("base64url")}`;

/** Uses a keyed hash for random credentials, requiring the encryption secret as well as the database. */
const hashOAuthClientSecret = (context: ServiceContext, clientSecret: string) =>
	createHmac("sha256", context.config.secrets.encryption)
		.update("lucid-oauth-client:secret\0", "utf8")
		.update(clientSecret, "utf8")
		.digest("hex");

/** Creates a client secret, with the hash to store. */
export const createOAuthClientSecret = (context: ServiceContext) => {
	const clientSecret = `${oauthClientSecretPrefix}${randomBytes(32).toString("base64url")}`;

	return {
		clientSecret,
		clientSecretHash: hashOAuthClientSecret(context, clientSecret),
	};
};

/** Checks a client secret against its stored hash in constant time. */
export const verifyOAuthClientSecret = (
	context: ServiceContext,
	clientSecret: string,
	clientSecretHash: string,
) => {
	const candidate = Buffer.from(
		hashOAuthClientSecret(context, clientSecret),
		"utf8",
	);
	const stored = Buffer.from(clientSecretHash, "utf8");

	return (
		candidate.byteLength === stored.byteLength &&
		timingSafeEqual(candidate, stored)
	);
};
