/** The part of reCAPTCHA Enterprise's browser API the admin and website widgets use. */
export type RecaptchaEnterprise = {
	ready: (callback: () => void) => void;
	execute: (siteKey: string, options: { action: string }) => Promise<string>;
	render: (
		container: HTMLElement,
		parameters: {
			sitekey: string;
			action: string;
			theme?: "light" | "dark";
			callback: (token: string) => void;
			"expired-callback": () => void;
			"error-callback": () => void;
		},
	) => number;
	reset: (widgetId: number) => void;
};

declare global {
	interface Window {
		grecaptcha?: { enterprise?: RecaptchaEnterprise };
	}
}
