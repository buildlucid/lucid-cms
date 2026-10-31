import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { copy } from "../../../libs/i18n/index.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import passkeyLogin from "../passkeys/login.js";

/** Run without a transaction so failed checks leave the passkey challenge consumed. */
const verifyPasskey: ServiceFn<
	[
		{
			challengeId: number;
			userId: number;
			response: AuthenticationResponseJSON;
		},
	],
	undefined
> = async (context, data) => {
	const loginRes = await passkeyLogin(context, {
		response: data.response,
		userId: data.userId,
	});
	if (loginRes.error) return loginRes;

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

	return {
		error: undefined,
		data: undefined,
	};
};

export default verifyPasskey;
