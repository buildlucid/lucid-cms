import type { CaptchaWidgetComponent } from "@lucidcms/admin/types";
import { createCaptchaTokenState, loadScript } from "@lucidcms/admin/utils";
import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
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
	const [failed, setFailed] = createSignal(false);
	let container: HTMLDivElement | undefined;
	let widgetId: string | undefined;
	let disposed = false;

	// ----------------------------------
	// Memos
	//* the widget's height, kept free while it loads so the form doesn't jump. Hidden appearances only show when needed
	const reservedHeight = createMemo(() => {
		if (failed() || props.client.appearance !== "always") return undefined;
		return props.client.size === "compact" ? "140px" : "65px";
	});

	// ----------------------------------
	// Functions
	const fail = () => {
		tokens.reset();
		setFailed(true);
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
	return (
		<div
			ref={container}
			style={{
				"min-height": reservedHeight(),
				//* a colour scheme that differs from the iframe's makes the browser paint it white until it loads
				"color-scheme": "light",
				//* stops the inline iframe leaving a text-line gap below it, so it fits the reserved height
				"line-height": "0",
			}}
		/>
	);
};

export default TurnstileWidget;
