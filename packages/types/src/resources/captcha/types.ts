/** Built-in public forms that a captcha adapter can protect. */
export type CaptchaForm =
	| "login"
	| "setup"
	| "requestPasswordReset"
	| "resetPassword"
	| "acceptInvitation"
	| "sharePassword";

export type CaptchaClientValue =
	| string
	| number
	| boolean
	| null
	| readonly CaptchaClientValue[]
	| { readonly [key: string]: CaptchaClientValue };

/** Values a captcha widget needs in the browser, such as a site key. Never include secrets. */
export type CaptchaClientOptions = {
	readonly [key: string]: CaptchaClientValue;
};

/** Public captcha settings for the admin's protected forms. */
export type CaptchaSettings = {
	/** The adapter key, which picks the widget that renders. */
	adapter: string;
	client: CaptchaClientOptions;
	/** Whether each built-in form is protected, and the action its token must carry. */
	forms: Record<CaptchaForm, { enabled: boolean; action: string }>;
};
