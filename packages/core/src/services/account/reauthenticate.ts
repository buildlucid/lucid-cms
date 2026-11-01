import { timingSafeEqual } from "node:crypto";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { TwoFactorProof } from "../../types/response.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import hashSecret from "../../utils/helpers/hash-secret.js";
import type { ServiceFn } from "../../utils/services/types.js";
import passkeyLogin from "../auth/passkeys/login.js";
import checkProof from "../auth/two-factor/check-proof.js";

/**
 * Checks reauthentication proof. Run without a transaction so failed passkey checks leave the
 * challenge consumed.
 */
const reauthenticate: ServiceFn<
	[
		{
			userId: number;
			proof:
				| TwoFactorProof
				| { password: string }
				| { passkey: AuthenticationResponseJSON };
		},
	],
	undefined
> = async (context, data) => {
	if ("passkey" in data.proof) {
		const loginRes = await passkeyLogin(context, {
			response: data.proof.passkey,
			userId: data.userId,
		});
		if (loginRes.error) return loginRes;

		return {
			error: undefined,
			data: undefined,
		};
	}

	if (!("password" in data.proof)) {
		return checkProof(context, {
			userId: data.userId,
			proof: data.proof,
		});
	}

	const Users = new UsersRepository(context.db);
	const userRes = await Users.selectSingle({
		select: ["password", "secret"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.userId,
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (userRes.error) return userRes;

	if (
		context.config.auth.password.enabled === false ||
		!userRes.data.password
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.reauthentication.password.unavailable"),
			},
			data: undefined,
		};
	}

	const passwordHash = Buffer.from(
		await hashSecret(
			data.proof.password,
			decrypt(userRes.data.secret, context.config.secrets.encryption),
		),
	);
	const storedHash = Buffer.from(userRes.data.password);
	if (
		passwordHash.length !== storedHash.length ||
		!timingSafeEqual(passwordHash, storedHash)
	) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.reauthentication.password.invalid"),
				errors: {
					password: {
						code: "invalid",
						message: copy("server:core.auth.reauthentication.password.invalid"),
					},
				},
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default reauthenticate;
