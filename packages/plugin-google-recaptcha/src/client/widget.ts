/**
 * Draws reCAPTCHA in the form around this script, as `toolkit.captcha.renderWidget` writes it:
 * in the `data-captcha` element, with its settings in `data-captcha-settings`. Score keys get a token
 * each time the form sends; checkbox keys show the "I'm not a robot" box, and a send waits until
 * it is ticked. Tokens go in a hidden input the form sends.
 *
 * Built to a minified string by `scripts/build-inline-script.ts`, which the adapter gives Lucid as
 * its `browserWidget`, so keep it small and free of runtime imports.
 */

import type {
	CaptchaWidgetEventMap,
	CaptchaWidgetSettings,
} from "@lucidcms/core/types";
import type { RecaptchaEnterprise } from "../provider-types.js";
import type { RecaptchaClientOptions } from "../types.js";

type WidgetSettings = CaptchaWidgetSettings & RecaptchaClientOptions;

declare global {
	interface HTMLElementEventMap extends CaptchaWidgetEventMap {}
}

const slot = document.currentScript?.parentElement;

/** Loads reCAPTCHA once for every form on the page, and waits until it can be used. */
const loadRecaptcha = (url: string) =>
	new Promise<RecaptchaEnterprise>((resolve, reject) => {
		//* enterprise.js downloads the rest of the SDK before it's ready
		const ready = () => {
			const recaptcha = window.grecaptcha?.enterprise;
			if (!recaptcha) return reject();
			recaptcha.ready(() => resolve(recaptcha));
		};
		if (window.grecaptcha?.enterprise) return ready();
		let script = document.querySelector(`script[src="${url}"]`);
		if (!script) {
			script = document.createElement("script");
			script.setAttribute("src", url);
			document.head.append(script);
		}
		script.addEventListener("load", ready);
		script.addEventListener("error", reject);
	});

if (slot) {
	//* written by Lucid from the adapter's client values
	let settings: Partial<WidgetSettings> = {};
	try {
		settings = JSON.parse(slot.getAttribute("data-captcha-settings") ?? "{}");
	} catch {}
	const { siteKey = "", action = "" } = settings;
	const score = settings.mode === "score";

	const input = document.createElement("input");
	input.type = "hidden";
	input.name = settings.field ?? "";
	slot.append(input);
	slot.addEventListener("captcha:reset", () => {
		input.value = "";
	});

	const recaptcha = loadRecaptcha(
		`https://www.google.com/recaptcha/enterprise.js?render=${score ? encodeURIComponent(siteKey) : "explicit"}`,
	)
		//* sent without a token, which the server refuses with its own message
		.catch(() => null);

	//* sends waiting for the box to be ticked, let go when it is or the check fails
	let waiting: (() => void)[] = [];
	const release = () => {
		for (const done of waiting) done();
		waiting = [];
	};

	if (!score) {
		void recaptcha.then((loaded) => {
			if (!loaded) return;
			const widgetId = loaded.render(slot, {
				sitekey: siteKey,
				action,
				callback: (token) => {
					input.value = token;
					release();
				},
				"expired-callback": () => {
					input.value = "";
				},
				"error-callback": release,
			});
			slot.addEventListener("captcha:reset", () => loaded.reset(widgetId));
		});
	}

	slot.addEventListener("captcha:token", (event) => {
		event.detail(
			recaptcha.then(async (loaded) => {
				if (!loaded) return;
				//* score tokens last two minutes, so each send gets its own
				if (score) {
					input.value = await loaded.execute(siteKey, { action });
					return;
				}
				if (input.value) return;
				return new Promise<void>((resolve) => waiting.push(resolve));
			}),
		);
	});
}
