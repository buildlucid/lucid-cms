import type { ResolvedLucidConfig } from "../../../types/config.js";
import getCaptchaForms from "../../captcha/get-forms.js";

/** Rejects built-in forms set to need a captcha when no captcha adapter is configured. */
const checkCaptcha = (config: ResolvedLucidConfig) => {
	if (config.captcha?.adapter) return;

	const forms = Object.entries(getCaptchaForms(config.captcha))
		.filter(([, form]) => form.enabled)
		.map(([key]) => key);
	if (forms.length > 0) {
		throw new Error(
			`Captcha protection is enabled for ${forms.join(", ")}, but no captcha adapter is configured. Add a captcha plugin or set captcha.forms to false.`,
		);
	}
};

export default checkCaptcha;
