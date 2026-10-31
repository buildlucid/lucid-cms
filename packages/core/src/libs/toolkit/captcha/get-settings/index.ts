import type { CaptchaSettings } from "@lucidcms/types";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";

const getSettings = async (
	context: ServiceContext,
): ServiceResponse<CaptchaSettings | null> =>
	runToolkitService({
		handler: async () => {
			const { default: getCaptchaSettings } =
				await import("../../../../services/captcha/get-settings.js");

			return getCaptchaSettings(context);
		},
		name: {
			key: "core.toolkit.captcha.get-settings.error.name",
			defaultMessage: "Captcha Toolkit Error",
		},
		message: {
			key: "core.toolkit.captcha.get-settings.error.message",
			defaultMessage: "Lucid toolkit could not read the captcha settings.",
		},
	});

export default getSettings;
