import type { CaptchaForm, CaptchaSettings } from "@lucidcms/types";
import type { CaptchaConfig } from "./types.js";

/** Whether each built-in form is protected once an adapter is set, and the action its tokens carry. */
const defaults = {
	login: { enabled: true, action: "lucid_login" },
	magicLink: { enabled: true, action: "lucid_magic_link" },
	setup: { enabled: true, action: "lucid_setup" },
	requestPasswordReset: {
		enabled: true,
		action: "lucid_request_password_reset",
	},
	resetPassword: { enabled: false, action: "lucid_reset_password" },
	acceptInvitation: { enabled: false, action: "lucid_accept_invitation" },
	sharePassword: { enabled: true, action: "lucid_share_password" },
} satisfies CaptchaSettings["forms"];

/** Resolves which built-in forms are protected. Defaults only apply once an adapter is set. */
const getCaptchaForms = (
	config: CaptchaConfig | undefined,
): CaptchaSettings["forms"] => {
	const resolve = (form: CaptchaForm) => ({
		action: defaults[form].action,
		enabled:
			config?.forms === false
				? false
				: (config?.forms?.[form] ??
					(config?.adapter !== undefined && defaults[form].enabled)),
	});

	return {
		login: resolve("login"),
		magicLink: resolve("magicLink"),
		setup: resolve("setup"),
		requestPasswordReset: resolve("requestPasswordReset"),
		resetPassword: resolve("resetPassword"),
		acceptInvitation: resolve("acceptInvitation"),
		sharePassword: resolve("sharePassword"),
	};
};

export default getCaptchaForms;
