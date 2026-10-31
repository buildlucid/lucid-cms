import type { CaptchaWidgetComponent } from "@lucidcms/admin/types";
import { createCaptchaTokenState, loadScript } from "@lucidcms/admin/utils";
import { onCleanup, onMount } from "solid-js";
import { SCRIPT_URL } from "../../../constants.js";
import type { TurnstileClientOptions } from "../../../types.js";

type Turnstile = {
	render: (
		container: HTMLElement,
		options: {
			sitekey: string;
			action: string;
			theme: "light" | "dark";
			language: "auto";
			size: TurnstileClientOptions["size"];
			appearance: TurnstileClientOptions["appearance"];
			retry: "never";
			callback: (token: string) => void;
			"expired-callback": () => void;
			"timeout-callback": () => void;
			"error-callback": () => void;
		},
	) => string | undefined;
	reset: (widgetId: string) => void;
	remove: (widgetId: string) => void;
};

declare global {
	interface Window {
		turnstile?: Turnstile;
	}
}

/** Renders Cloudflare Turnstile and hands its tokens to the protected form. */
const TurnstileWidget: CaptchaWidgetComponent<
	undefined,
	TurnstileClientOptions
> = (props) => {
	// ----------------------------------
	// State & Hooks
	const tokens = createCaptchaTokenState();
	let container: HTMLDivElement | undefined;
	let widgetId: string | undefined;
	let disposed = false;

	// ----------------------------------
	// Functions
	const fail = () => {
		tokens.reset();
		props.onError();
	};
	const mount = async () => {
		await loadScript(SCRIPT_URL);
		const turnstile = window.turnstile;
		if (disposed || !container) return;
		if (!turnstile) throw new Error("Turnstile is unavailable.");

		const reset = () => {
			tokens.reset();
			if (widgetId) turnstile.reset(widgetId);
		};
		widgetId = turnstile.render(container, {
			sitekey: props.client.siteKey,
			action: props.action,
			theme: props.theme,
			//* the browser's language, as Turnstile supports fewer locales than the admin
			language: "auto",
			size: props.client.size,
			appearance: props.client.appearance,
			//* errors reach the form's retry, which mounts a fresh widget
			retry: "never",
			callback: tokens.setToken,
			"expired-callback": tokens.reset,
			"timeout-callback": reset,
			"error-callback": fail,
		});
		props.register({ getToken: () => tokens.getToken(), reset });
	};

	// ----------------------------------
	// Effects
	onMount(() => {
		mount().catch(fail);
	});
	onCleanup(() => {
		disposed = true;
		tokens.reset();
		if (widgetId) window.turnstile?.remove(widgetId);
	});

	// ----------------------------------
	// Render
	return <div ref={container} />;
};

export default TurnstileWidget;
