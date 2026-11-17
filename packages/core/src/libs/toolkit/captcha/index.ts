import type { CaptchaSettings } from "@lucidcms/types";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import getSettings from "./get-settings/index.js";
import renderWidget, {
	type ToolkitCaptchaRenderWidgetInput,
} from "./render-widget/index.js";
import verify, {
	type ToolkitCaptchaVerifyInput,
	type ToolkitCaptchaVerifyResult,
} from "./verify/index.js";

export type ToolkitCaptcha = {
	/** Checks a token once, before the protected work runs. Missing tokens fail with `captcha_required`. */
	verify: (
		input: ToolkitCaptchaVerifyInput,
	) => ServiceResponse<ToolkitCaptchaVerifyResult>;
	/** Returns the public values a widget needs, such as a site key, or null when no adapter is configured. */
	getSettings: () => ServiceResponse<CaptchaSettings | null>;
	/**
	 * Returns the HTML for the adapter's widget in a form outside the admin, with its script when it
	 * has one, or null when no adapter is configured. The widget writes its token to an input named
	 * `field`, carrying `action`, for `verify` to check.
	 *
	 * @example
	 * ```ts
	 * const { data: widget } = await toolkit.captcha.renderWidget({ action: "contact", field: "captcha" });
	 * ```
	 */
	renderWidget: (
		input: ToolkitCaptchaRenderWidgetInput,
	) => ServiceResponse<string | null>;
};

/** Creates captcha helpers for a toolkit instance. */
export const createCaptchaToolkit = (
	context: ServiceContext,
): ToolkitCaptcha => ({
	verify: (input) => verify(context, input),
	getSettings: () => getSettings(context),
	renderWidget: (input) => renderWidget(context, input),
});

export default createCaptchaToolkit;
