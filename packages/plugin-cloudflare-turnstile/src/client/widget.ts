/**
 * Draws Turnstile in the form around this script, as `toolkit.captcha.renderWidget` writes it:
 * in the `data-captcha` element, with its settings in `data-captcha-settings`. Turnstile writes its
 * token to the input the form sends. When the form asks for a token before the check has passed,
 * sending waits for it.
 *
 * Built to a minified string by `scripts/build-inline-script.ts`, which the adapter gives Lucid as
 * its `browserWidget`, so keep it small and free of runtime imports.
 */

import type {
	CaptchaWidgetEventMap,
	CaptchaWidgetSettings,
} from "@lucidcms/core/types";
import type { Turnstile } from "../provider-types.js";
import type { TurnstileClientOptions } from "../types.js";

type WidgetSettings = CaptchaWidgetSettings & TurnstileClientOptions;

declare global {
	interface HTMLElementEventMap extends CaptchaWidgetEventMap {}
}

const scriptUrl =
	"https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const slot = document.currentScript?.parentElement;

/** Loads Turnstile once for every form on the page. */
const loadTurnstile = () =>
	new Promise<Turnstile>((resolve, reject) => {
		if (window.turnstile) return resolve(window.turnstile);
		let script = document.querySelector(`script[src="${scriptUrl}"]`);
		if (!script) {
			script = document.createElement("script");
			script.setAttribute("src", scriptUrl);
			document.head.append(script);
		}
		script.addEventListener("load", () =>
			window.turnstile ? resolve(window.turnstile) : reject(),
		);
		script.addEventListener("error", reject);
	});

if (slot) {
	//* written by Lucid from the adapter's client values
	let settings: Partial<WidgetSettings> = {};
	try {
		settings = JSON.parse(slot.getAttribute("data-captcha-settings") ?? "{}");
	} catch {}

	//* sends waiting for a token, let go when one arrives or the check fails
	let waiting: (() => void)[] = [];
	const release = () => {
		for (const done of waiting) done();
		waiting = [];
	};

	//* reads the token once the widget is drawn, or null when Turnstile couldn't load
	const response = loadTurnstile()
		.then((turnstile) => {
			const widgetId = turnstile.render(slot, {
				sitekey: settings.siteKey ?? "",
				action: settings.action,
				size: settings.size,
				appearance: settings.appearance,
				"response-field-name": settings.field,
				callback: release,
				"error-callback": release,
				"timeout-callback": release,
			});
			if (widgetId === undefined) return null;
			slot.addEventListener("captcha:reset", () => turnstile.reset(widgetId));
			return () => turnstile.getResponse(widgetId);
		})
		//* sent without a token, which the server refuses with its own message
		.catch(() => null);

	slot.addEventListener("captcha:token", (event) => {
		event.detail(
			response.then((read) => {
				if (!read || read()) return;
				return new Promise<void>((resolve) => waiting.push(resolve));
			}),
		);
	});
}
