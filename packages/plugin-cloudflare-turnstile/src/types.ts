export type TurnstileSize = "normal" | "compact" | "flexible";
export type TurnstileAppearance = "always" | "execute" | "interaction-only";

export interface PluginOptions {
	/**
	 * The widget's site key from the Cloudflare dashboard.
	 */
	siteKey: string;
	/**
	 * The widget's secret key. Keep it in an environment variable.
	 */
	secretKey: string;
	/**
	 * Hostnames tokens may come from, such as `cms.example.com`. Cloudflare already limits widgets to the
	 * domains set in the dashboard, so this is an extra check.
	 */
	hostnames?: string[];
	/**
	 * The widget size. Defaults to "flexible".
	 */
	size?: TurnstileSize;
	/**
	 * When the widget shows. "interaction-only" shows it only when someone needs to click. Defaults to "always".
	 */
	appearance?: TurnstileAppearance;
	/**
	 * Send the visitor's IP address to Cloudflare with each check. Defaults to false.
	 */
	sendRemoteIp?: boolean;
}

/** Public values the adapter sends to its widget. */
export type TurnstileClientOptions = {
	siteKey: string;
	size: TurnstileSize;
	appearance: TurnstileAppearance;
};
