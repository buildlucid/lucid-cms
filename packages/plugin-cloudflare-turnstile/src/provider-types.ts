import type { TurnstileClientOptions } from "./types.js";

/** The part of Turnstile's browser API the admin and website widgets use. */
export type Turnstile = {
	render: (
		container: HTMLElement,
		options: {
			sitekey: string;
			action?: string;
			theme?: "light" | "dark";
			language?: "auto";
			size?: TurnstileClientOptions["size"];
			appearance?: TurnstileClientOptions["appearance"];
			retry?: "never";
			/** The input Turnstile writes its token to, inside the container. */
			"response-field-name"?: string;
			callback: (token: string) => void;
			"expired-callback"?: () => void;
			"timeout-callback": () => void;
			"error-callback": () => void;
		},
	) => string | undefined;
	getResponse: (widgetId: string) => string | undefined;
	reset: (widgetId: string) => void;
	remove: (widgetId: string) => void;
};

declare global {
	interface Window {
		turnstile?: Turnstile;
	}
}
