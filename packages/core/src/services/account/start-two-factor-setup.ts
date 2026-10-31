import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { TwoFactorSetup } from "../../types/response.js";
import type { TwoFactorProof } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkProof from "../auth/two-factor/check-proof.js";
import createSecret from "../auth/two-factor/create-secret.js";

/**
 * Starts setting up an authenticator app from the account page. Replacing an
 * app that's already set up needs a code from it, or a recovery code.
 */
const startTwoFactorSetup: ServiceFn<
	[
		{
			userId: number;
			proof?: TwoFactorProof;
		},
	],
	TwoFactorSetup
> = async (context, data) => {
	if (!context.config.auth.twoFactor.enabled) {
		return {
			error: {
				type: "basic",
				status: 400,
				message: copy("server:core.auth.two.factor.disabled.message"),
			},
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db);
	const userRes = await Users.selectSingle({
		select: ["two_factor_enabled_at"],
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

	if (userRes.data.two_factor_enabled_at) {
		if (!data.proof) {
			return {
				error: {
					type: "basic",
					status: 400,
					message: copy("server:core.auth.two.factor.proof.required.message"),
				},
				data: undefined,
			};
		}

		const proofRes = await checkProof(context, {
			userId: data.userId,
			proof: data.proof,
		});
		if (proofRes.error) return proofRes;
	}

	return createSecret(context, { userId: data.userId });
};

export default startTwoFactorSetup;
