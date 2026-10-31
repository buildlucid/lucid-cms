import type { CaptchaWidgetComponent } from "@lucidcms/admin/types";
import { createCaptchaTokenState, loadScript } from "@lucidcms/admin/utils";
import { onCleanup, onMount } from "solid-js";
import { SCRIPT_URL } from "../../../constants.js";
import type { RecaptchaClientOptions } from "../../../types.js";

type RecaptchaEnterprise = {
	ready: (callback: () => void) => void;
	execute: (siteKey: string, options: { action: string }) => Promise<string>;
	render: (
		container: HTMLElement,
		parameters: {
			sitekey: string;
			action: string;
			theme: "light" | "dark";
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

/** Score keys place a badge on the page, which only shows while a protected form is open. */
const setBadgeVisible = (visible: boolean) => {
	const badge = document.querySelector<HTMLElement>(".grecaptcha-badge");
	if (badge) badge.style.visibility = visible ? "visible" : "hidden";
};

/** Renders Google reCAPTCHA and hands its tokens to the protected form. */
const RecaptchaWidget: CaptchaWidgetComponent<
	undefined,
	RecaptchaClientOptions
> = (props) => {
	// ----------------------------------
	// State & Hooks
	const tokens = createCaptchaTokenState();
	let container: HTMLDivElement | undefined;
	let widgetId: number | undefined;
	let disposed = false;

	// ----------------------------------
	// Functions
	const fail = () => {
		tokens.reset();
		props.onError();
	};
	const mountScore = (recaptcha: RecaptchaEnterprise) => {
		setBadgeVisible(true);
		props.register({
			getToken: () =>
				recaptcha.execute(props.client.siteKey, { action: props.action }),
			reset: () => undefined,
		});
	};
	const mountCheckbox = (
		recaptcha: RecaptchaEnterprise,
		element: HTMLDivElement,
	) => {
		widgetId = recaptcha.render(element, {
			sitekey: props.client.siteKey,
			action: props.action,
			theme: props.theme,
			callback: tokens.setToken,
			"expired-callback": tokens.reset,
			"error-callback": fail,
		});
		props.register({
			getToken: () => tokens.getToken(),
			reset: () => {
				tokens.reset();
				if (widgetId !== undefined) recaptcha.reset(widgetId);
			},
		});
	};
	const mount = async () => {
		const { siteKey, mode } = props.client;
		//* enterprise.js downloads the rest of the SDK before it's ready
		await loadScript(
			mode === "score"
				? `${SCRIPT_URL}?render=${encodeURIComponent(siteKey)}`
				: `${SCRIPT_URL}?render=explicit`,
			() =>
				new Promise<void>((resolve, reject) => {
					const recaptcha = window.grecaptcha?.enterprise;
					if (!recaptcha) {
						reject(new Error("reCAPTCHA is unavailable."));
						return;
					}
					recaptcha.ready(resolve);
				}),
		);
		const recaptcha = window.grecaptcha?.enterprise;
		if (disposed || !container) return;
		if (!recaptcha) throw new Error("reCAPTCHA is unavailable.");

		if (mode === "score") {
			mountScore(recaptcha);
			return;
		}
		mountCheckbox(recaptcha, container);
	};

	// ----------------------------------
	// Effects
	onMount(() => {
		mount().catch(fail);
	});
	onCleanup(() => {
		disposed = true;
		tokens.reset();
		setBadgeVisible(false);
		//* Google asks for checkbox widgets to be reset before removal
		if (widgetId !== undefined) window.grecaptcha?.enterprise?.reset(widgetId);
	});

	// ----------------------------------
	// Render
	return <div ref={container} />;
};

export default RecaptchaWidget;
