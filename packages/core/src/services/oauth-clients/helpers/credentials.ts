import { randomBytes, timingSafeEqual } from "node:crypto";
import { decrypt } from "../../../utils/helpers/encrypt-decrypt.js";
import hashSecret from "../../../utils/helpers/hash-secret.js";
import { generateSecret } from "../../../utils/helpers/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

export const oauthClientIdPrefix = "lucid_oauth_";
export const oauthClientSecretPrefix = "lucid_oauth_secret_";

export const createOAuthClientId = () =>
	`${oauthClientIdPrefix}${randomBytes(12).toString("base64url")}`;

export const createOAuthClientSecret = async (encryptionKey: string) => {
	const clientSecret = `${oauthClientSecretPrefix}${randomBytes(32).toString("base64url")}`;
	const { secret, encryptSecret } = generateSecret(encryptionKey);
	const clientSecretHash = await hashSecret(clientSecret, secret);

	return {
		clientSecret,
		clientSecretHash,
		clientSecretSalt: encryptSecret,
	};
};

export const verifyOAuthClientSecret = async (
	clientSecret: string,
	clientSecretHash: string,
	encryptedSalt: string,
	encryptionKey: string,
): ServiceResponse<true> => {
	try {
		const salt = decrypt(encryptedSalt, encryptionKey);
		const candidateHash = await hashSecret(clientSecret, salt);
		const candidate = Buffer.from(candidateHash, "utf8");
		const stored = Buffer.from(clientSecretHash, "utf8");

		if (
			candidate.byteLength !== stored.byteLength ||
			!timingSafeEqual(candidate, stored)
		) {
			return {
				error: {
					type: "authorisation",
					code: "invalid_client",
					status: 401,
				},
				data: undefined,
			};
		}

		return {
			error: undefined,
			data: true,
		};
	} catch (cause) {
		return {
			error: {
				type: "basic",
				status: 500,
				cause,
			},
			data: undefined,
		};
	}
};
