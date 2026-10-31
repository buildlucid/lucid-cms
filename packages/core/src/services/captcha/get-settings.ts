import type { CaptchaSettings } from "@lucidcms/types";
import getCaptchaForms from "../../libs/captcha/get-forms.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Public captcha settings for browser widgets, or null when no adapter is configured. */
const getSettings: ServiceFn<[], CaptchaSettings | null> = async (context) => {
	if (!context.captcha) {
		return {
			error: undefined,
			data: null,
		};
	}

	return {
		error: undefined,
		data: {
			adapter: context.captcha.key,
			client: context.captcha.client ?? {},
			forms: getCaptchaForms(context.config.captcha),
		},
	};
};

export default getSettings;
