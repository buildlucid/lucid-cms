import type { CaptchaForm } from "@types";
import { createMemo, createSignal } from "solid-js";
import type { CaptchaWidgetHandle } from "@/components/CaptchaWidget/types";
import api from "@/services/api";

/** One protected form's captcha state. Render it with CaptchaWidget and send requests through `submit`. */
export type CaptchaState = ReturnType<typeof useCaptcha>;

/** Holds a form's captcha widget and gets a fresh token for each submission. */
export const useCaptcha = (form: CaptchaForm) => {
	const settingsQuery = api.captcha.useGetSettings();
	const [handle, setHandle] = createSignal<CaptchaWidgetHandle>();
	const [failed, setFailed] = createSignal(false);
	const [submitting, setSubmitting] = createSignal(false);
	const [revision, setRevision] = createSignal(0);

	const settings = createMemo(() => settingsQuery.data?.data ?? null);
	const enabled = createMemo(() => settings()?.forms[form].enabled === true);

	return {
		form,
		settings,
		enabled,
		/** Changes on retry, so the widget mounts again. */
		revision,
		failed: () => settingsQuery.isError || failed(),
		isPending: () => settingsQuery.isPending || submitting(),
		register: (widget: CaptchaWidgetHandle) => {
			setHandle(widget);
			setFailed(false);
		},
		/** Forgets the widget once it unmounts, so a submission finishing later doesn't reset a removed widget. */
		unregister: () => {
			setHandle(undefined);
		},
		onError: () => {
			setHandle(undefined);
			setFailed(true);
		},
		retry: () => {
			setHandle(undefined);
			setFailed(false);
			if (settingsQuery.isError) void settingsQuery.refetch();
			else setRevision((value) => value + 1);
		},
		/** Gets a token when the form is protected, sends the request, then resets the widget. */
		submit: async (send: (token: string | undefined) => Promise<unknown>) => {
			if (submitting()) return;
			if (!settingsQuery.isSuccess) {
				setFailed(true);
				return;
			}

			setSubmitting(true);
			try {
				let token: string | undefined;
				if (enabled()) {
					const widget = handle();
					if (!widget) {
						setFailed(true);
						return;
					}
					try {
						token = await widget.getToken();
					} catch {
						setFailed(true);
						return;
					}
				}
				//* the request's own mutation shows its errors
				await send(token).catch(() => undefined);
			} finally {
				setSubmitting(false);
				handle()?.reset();
			}
		},
	};
};
