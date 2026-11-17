import type { CaptchaWidgetProps } from "@lucidcms/admin/types";
import { createCaptchaTokenState, loadScript } from "@lucidcms/admin/utils";
import {
	type Component,
	createMemo,
	createSignal,
	onCleanup,
	onMount,
} from "solid-js";
import { SCRIPT_URL } from "../../../constants.js";
import type { TurnstileClientOptions } from "../../../types.js";

/** Renders Cloudflare Turnstile and hands its tokens to the protected form. */
const TurnstileWidget: Component<
	CaptchaWidgetProps<undefined, TurnstileClientOptions>
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
				"color-scheme": "light",
				"line-height": "0",
			}}
		/>
	);
};

export default TurnstileWidget;
