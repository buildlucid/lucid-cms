export type RecaptchaMode = "score" | "checkbox";

export interface PluginOptions {
	/**
	 * The reCAPTCHA key ID from the Google Cloud console, used by the widget.
	 */
	siteKey: string;
	/**
	 * The Google Cloud project the key belongs to.
	 */
	projectId: string;
	/**
	 * A Google Cloud API key restricted to the reCAPTCHA Enterprise API. Keep it in an environment variable.
	 */
	apiKey: string;
	/**
	 * Matches the key's type. "score" runs without a challenge, "checkbox" shows the "I'm not a robot" box.
	 * Defaults to "score".
	 */
	mode?: RecaptchaMode;
	/**
	 * The lowest score that passes, from 0 (likely a bot) to 1. Defaults to 0.5 for score keys. Checkbox keys
	 * are only scored when you set it.
	 */
	minScore?: number;
	/**
	 * Hostnames tokens may come from, such as `cms.example.com`. Google already limits keys to their
	 * domains unless you turned that off, so this is an extra check.
	 */
	hostnames?: string[];
	/**
	 * Send the visitor's IP address to Google with each assessment. Defaults to false.
	 */
	sendRemoteIp?: boolean;
}

/** Public values the adapter sends to its widget. */
export type RecaptchaClientOptions = {
	siteKey: string;
	mode: RecaptchaMode;
};
