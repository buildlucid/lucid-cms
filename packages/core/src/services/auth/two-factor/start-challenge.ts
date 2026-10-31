import { setCookie } from "hono/cookie";
import constants from "../../../constants/constants.js";
import formatter from "../../../libs/formatters/index.js";
import createServiceContext from "../../../libs/http/utils/create-service-context.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import type { TwoFactorStep } from "../../../types/response.js";
import { isRequestSecure } from "../../../utils/helpers/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import createUserToken from "../../user-tokens/create-single.js";
import isRequired from "./is-required.js";

/**
 * Issues a challenge cookie when two-factor authentication is enabled or required. Returns undefined
 * when no challenge is needed.
 */
const startChallenge = async (
	c: LucidHonoContext,
	data: {
		userId: number;
		/** Recorded as the login's method once the challenge is passed. */
		authMethod: string;
	},
): ServiceResponse<{ step: TwoFactorStep } | undefined> => {
	const context = createServiceContext(c);

	if (!context.config.auth.twoFactor.enabled) {
		return {
			error: undefined,
			data: undefined,
		};
	}

	const Users = new UsersRepository(context.db);
	const userRes = await Users.selectSingle({
		select: ["two_factor_enabled_at", "super_admin"],
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

	//* without an app set up, only users who are required to use one have a step
	if (!userRes.data.two_factor_enabled_at) {
		const requiredRes = await isRequired(context, {
			userId: data.userId,
			superAdmin: formatter.formatBoolean(userRes.data.super_admin),
		});
		if (requiredRes.error) return requiredRes;
		if (!requiredRes.data) {
			return {
				error: undefined,
				data: undefined,
			};
		}
	}

	const step: TwoFactorStep = userRes.data.two_factor_enabled_at
		? "verify"
		: "setup";

	const expiresInSeconds = constants.twoFactor.challengeExpirationMinutes * 60;
	const tokenRes = await createUserToken(context, {
		userId: data.userId,
		tokenType: constants.userTokens.twoFactorChallenge,
		expiryDate: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
		authMethod: data.authMethod,
	});
	if (tokenRes.error) return tokenRes;

	setCookie(c, constants.cookies.twoFactorChallenge, tokenRes.data.token, {
		maxAge: expiresInSeconds,
		httpOnly: true,
		secure: isRequestSecure(c),
		sameSite: "strict",
		path: "/",
	});

	return {
		error: undefined,
		data: { step },
	};
};

export default startChallenge;
