import { getCookie } from "hono/cookie";
import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import createServiceContext from "../../../libs/http/utils/create-service-context.js";
import { copy } from "../../../libs/i18n/index.js";
import { UserTokensRepository } from "../../../libs/repositories/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type { TwoFactorStep } from "../../../types/response.js";
import hashUserToken from "../../../utils/helpers/hash-user-token.js";
import type { ServiceResponse } from "../../../utils/services/types.js";

/** Reads the challenge cookie and derives the step from the user's current setup. */
const getChallenge = async (
	c: LucidHonoContext,
): ServiceResponse<{
	id: number;
	userId: number;
	authMethod: string;
	step: TwoFactorStep;
}> => {
	const token = getCookie(c, constants.cookies.twoFactorChallenge);
	if (!token) {
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

	const context = createServiceContext(c);
	const UserTokens = new UserTokensRepository(context.db);

	const challengeRes = await UserTokens.selectActiveTwoFactorChallenge({
		token: hashUserToken(token),
	});
	if (challengeRes.error) return challengeRes;

	const challenge = challengeRes.data;
	if (!challenge || formatter.formatBoolean(challenge.user_is_deleted)) {
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

	if (formatter.formatBoolean(challenge.user_is_locked)) {
		return {
			error: {
				type: "authorisation",
				status: 401,
				message: copy("server:core.auth.login.locked.error.message"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: {
			id: challenge.id,
			userId: challenge.user_id,
			authMethod: challenge.auth_method ?? "password",
			step: challenge.user_two_factor_enabled_at ? "verify" : "setup",
		},
	};
};

export default getChallenge;
