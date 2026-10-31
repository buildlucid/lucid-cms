import constants from "../../constants/constants.js";
import type { CaptchaVerification } from "../../libs/captcha/types.js";
import { copy } from "../../libs/i18n/index.js";
import logger from "../../libs/logger/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Checks a token once. Provider failures reject the request. */
const verify: ServiceFn<
	[
		{
			token?: string | null;
			action: string;
		},
	],
	{
		score?: number;
	}
> = async (context, data) => {
	if (!context.captcha) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.captcha.error.name"),
				status: 500,
				message: copy("server:core.captcha.not.configured"),
			},
			data: undefined,
		};
	}

	const token = data.token?.trim();
	if (!token) {
		return {
			error: {
				type: "basic",
				name: copy("server:core.captcha.error.name"),
				status: 400,
				code: "captcha_required",
				message: copy("server:core.captcha.required"),
			},
			data: undefined,
		};
	}

	let result: CaptchaVerification;
	try {
		result = await context.captcha.verify(context, {
			token,
			action: data.action,
		});
	} catch (error) {
		logger.warn({
			error,
			event: "captcha.verify.unavailable",
			scope: constants.logScopes.captchaAdapter,
			message: "The captcha provider could not check a token",
			data: { adapter: context.captcha.key, action: data.action },
		});
		return {
			error: {
				type: "basic",
				name: copy("server:core.captcha.error.name"),
				status: 503,
				code: "captcha_unavailable",
				message: copy("server:core.captcha.unavailable"),
			},
			data: undefined,
		};
	}

	if (!result.success) {
		logger.debug({
			event: "captcha.verify.failed",
			scope: constants.logScopes.captchaAdapter,
			message: "A captcha token failed verification",
			data: {
				adapter: context.captcha.key,
				action: data.action,
				reason: result.reason,
			},
		});
		return {
			error: {
				type: "basic",
				name: copy("server:core.captcha.error.name"),
				status: 403,
				code: "captcha_invalid",
				message: copy("server:core.captcha.invalid"),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: { score: result.score },
	};
};

export default verify;
