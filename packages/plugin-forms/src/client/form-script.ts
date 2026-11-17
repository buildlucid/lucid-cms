/**
 * Sends the form just before this script in place, as `renderForm` writes it. Answers the server
 * refuses show in their `data-error` element, with the first one focused; other failures show in
 * `data-status`; and the form's message replaces it, or its redirect is followed. A captcha widget
 * in `data-captcha` is asked for a fresh token before sending (`captcha:token`), and to start again
 * after a failed send (`captcha:reset`), as tokens only work once.
 *
 * Built to a minified string by `scripts/build-form-script.ts`, which `renderForm` inlines after
 * every form, so keep it small and free of runtime imports. The form is reached through prototypes, as a
 * field named like a form property, such as `action` or `id`, replaces that property on it.
 */

import type { CaptchaWidgetEventMap } from "@lucidcms/core/types";

type CaptchaEvent = keyof CaptchaWidgetEventMap;

type Confirmation =
	| { type: "message"; message: string }
	| { type: "redirect"; url: string };

type SubmitResponse = {
	data?: { confirmation?: Confirmation };
	message?: string;
	errors?: { values?: Record<string, { message?: string }> };
};

const failed = "The form couldn't be sent. Try again.";
const element = Element.prototype;
const form = document.currentScript?.previousElementSibling;

if (form instanceof HTMLFormElement) {
	const attribute = (name: string) => element.getAttribute.call(form, name);
	const find = (selector: string) =>
		[...element.querySelectorAll.call(form, selector)].filter(
			(found) => found instanceof HTMLElement,
		);
	const status = find("[data-status]")[0];
	const captchas = find("[data-captcha]");

	/** Waits for each captcha widget to write a fresh token, for widgets that wait to be asked. */
	const refreshTokens = async () => {
		const pending: Promise<unknown>[] = [];
		for (const captcha of captchas) {
			captcha.dispatchEvent(
				new CustomEvent("captcha:token" satisfies CaptchaEvent, {
					detail: ((wait) => {
						pending.push(wait);
					}) satisfies CaptchaWidgetEventMap["captcha:token"]["detail"],
				}),
			);
		}
		await Promise.allSettled(pending);
	};

	/** Puts the form's message in its place, and moves focus to it so screen readers announce it. */
	const showSent = (message: string) => {
		const sent = document.createElement("div");
		const paragraph = document.createElement("p");
		sent.id = attribute("id") ?? "";
		sent.setAttribute("data-form", attribute("data-form") ?? "");
		sent.setAttribute("data-sent", "");
		sent.setAttribute("role", "status");
		sent.tabIndex = -1;
		paragraph.textContent = message;
		sent.append(paragraph);
		element.replaceWith.call(form, sent);
		sent.focus();
	};

	/** Shows each refused answer's message in its field, and moves focus to the first. */
	const showErrors = (errors: Record<string, { message?: string }>) => {
		let first: HTMLElement | undefined;
		for (const [name, error] of Object.entries(errors)) {
			const key = CSS.escape(name);
			for (const message of find(`[data-error="${key}"]`)) {
				message.textContent = error.message ?? "";
				message.hidden = false;
			}
			for (const control of find(`[name="${key}"]`)) {
				control.setAttribute("aria-invalid", "true");
				first ??= control;
			}
		}
		first?.focus();
	};

	EventTarget.prototype.addEventListener.call(form, "submit", async (event) => {
		event.preventDefault();
		const submit =
			event instanceof SubmitEvent &&
			event.submitter instanceof HTMLButtonElement
				? event.submitter
				: null;
		if (submit?.disabled) return;
		if (submit) submit.disabled = true;

		for (const message of find("[data-error]")) {
			message.hidden = true;
			message.textContent = "";
		}
		for (const control of find("[aria-invalid]")) {
			control.removeAttribute("aria-invalid");
		}

		let sent = false;
		try {
			await refreshTokens();
			const response = await fetch(attribute("action") ?? "", {
				method: "POST",
				body: new FormData(form),
				headers: { Accept: "application/json" },
			});
			const body: SubmitResponse = await response.json().catch(() => ({}));
			const confirmation = body.data?.confirmation;

			if (response.ok && confirmation) {
				sent = true;
				if (confirmation.type === "redirect") {
					location.assign(confirmation.url);
				} else {
					showSent(confirmation.message);
				}
				return;
			}

			showErrors(body.errors?.values ?? {});
			if (status) status.textContent = body.message ?? failed;
		} catch {
			if (status) status.textContent = failed;
		} finally {
			if (submit) submit.disabled = false;
			if (!sent) {
				for (const captcha of captchas) {
					captcha.dispatchEvent(
						new Event("captcha:reset" satisfies CaptchaEvent),
					);
				}
			}
		}
	});
}
