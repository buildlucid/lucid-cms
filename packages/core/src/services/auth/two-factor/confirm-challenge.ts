import { copy } from "../../../libs/i18n/index.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { TwoFactorRecoveryCodes } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import activateSecret from "./activate-secret.js";

/** Run in a transaction so an invalid code leaves the setup challenge open. */
const confirmChallenge: ServiceFn<
	[
		{
			challengeId: number;
			userId: number;
			code: string;
		},
	],
	TwoFactorRecoveryCodes
> = async (context, data) => {
	const UserTokens = new UserTokensRepository(context.db);

	const consumeRes = await UserTokens.consumeTwoFactorChallenge({
		id: data.challengeId,
	});
	if (consumeRes.error) return consumeRes;
	if (!consumeRes.data) {
		return {
			error: {
				type: "authorisation",
				code: "two_factor_expired",
				status: 401,
				message: copy("server:core.auth.two.factor.challenge.expired.message"),
			},
			data: undefined,
		};
	}

	return activateSecret(context, {
		userId: data.userId,
		code: data.code,
	});
};

export default confirmChallenge;
