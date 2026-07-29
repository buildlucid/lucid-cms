import { timingSafeEqual } from "node:crypto";
import { scrypt } from "@noble/hashes/scrypt.js";
import { randomBytes } from "@noble/hashes/utils.js";
import constants from "../../../constants/constants.js";
import { decrypt } from "../../../utils/helpers/encrypt-decrypt.js";
import { generateSecret } from "../../../utils/helpers/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

export const oauthClientIdPrefix = "lucid_oauth_";
export const oauthClientSecretPrefix = "lucid_oauth_secret_";

export const createOAuthClientId = () =>
	`${oauthClientIdPrefix}${Buffer.from(randomBytes(12)).toString("base64url")}`;

export const createOAuthClientSecret = (encryptionKey: string) => {
	const clientSecret = `${oauthClientSecretPrefix}${Buffer.from(
		randomBytes(32),
	).toString("base64url")}`;
	const { secret, encryptSecret } = generateSecret(encryptionKey);
	const clientSecretHash = Buffer.from(
		scrypt(clientSecret, secret, constants.scrypt),
	).toString("base64");

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
		const candidateHash = Buffer.from(
			scrypt(clientSecret, salt, constants.scrypt),
		).toString("base64");
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
