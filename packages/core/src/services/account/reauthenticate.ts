import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { TwoFactorProof } from "../../types/response.js";
import { decrypt } from "../../utils/helpers/encrypt-decrypt.js";
import type { ServiceFn } from "../../utils/services/types.js";
import passkeyLogin from "../auth/passkeys/login.js";
import checkProof from "../auth/two-factor/check-proof.js";
import verifyPassword from "../auth/verify-password.js";

/**
 * Checks reauthentication proof. Run without a transaction so failed passkey checks leave the
 * challenge consumed and wrong passwords stay counted.
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

	const passwordRes = await verifyPassword(context, {
		account: { userId: data.userId },
		password: data.proof.password,
		stored: {
			hash: userRes.data.password,
			salt: decrypt(userRes.data.secret, context.config.secrets.encryption),
		},
	});
	if (passwordRes.error) return passwordRes;
	if (!passwordRes.data) {
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
