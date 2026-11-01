import { copy } from "../../libs/i18n/index.js";
import { UsersRepository } from "../../libs/repositories/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { TwoFactorSetup } from "../../types/response.js";
import type { TwoFactorProof } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkRecentAuthentication from "../auth/checks/check-recent-authentication.js";
import checkProof from "../auth/two-factor/check-proof.js";
import createSecret from "../auth/two-factor/create-secret.js";

/** Requires an app or recovery code for replacement, or a recent login for initial setup. */
const startTwoFactorSetup: ServiceFn<
	[
		{
			auth: LucidAuth;
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
				value: data.auth.id,
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
			userId: data.auth.id,
			proof: data.proof,
		});
		if (proofRes.error) return proofRes;
	} else {
		const recentRes = checkRecentAuthentication(data.auth);
		if (recentRes.error) return recentRes;
	}

	return createSecret(context, { userId: data.auth.id });
};

export default startTwoFactorSetup;
