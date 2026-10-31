import type { CaptchaClientOptions, CaptchaForm } from "@lucidcms/types";
import type { Component } from "solid-js";
import type { AdminOptions } from "../../extensions/types/config.js";
import type { captchaSlotPolicies } from "./constants.js";

export type CaptchaSlot = keyof typeof captchaSlotPolicies;

export type CaptchaSlotMatch = {
	/** The captcha adapter key the widget works with. */
	adapter?: string;
};

export type CaptchaSlotPlacement = {
	/** Renders the configured captcha adapter's widget on protected public forms. */
	slot: "captcha.widget";
	match?: CaptchaSlotMatch;
};

/** What a protected form needs from its widget. */
export type CaptchaWidgetHandle = {
	/** Resolves with a fresh token for the next submission, running an invisible challenge when needed. */
	getToken: () => Promise<string>;
	/** Clears the used token, as each token works once. */
	reset: () => void;
};

export type CaptchaWidgetProps<
	TOptions extends AdminOptions | undefined = undefined,
	TClient extends CaptchaClientOptions = CaptchaClientOptions,
> = {
	readonly slot: "captcha.widget";
	readonly key: string;
	/** Public values from the captcha adapter, such as the site key. */
	readonly client: TClient;
	/** The form being protected. */
	readonly form: CaptchaForm;
	/** The action the server expects the token to carry. */
	readonly action: string;
	readonly theme: "light" | "dark";
	readonly options: TOptions;
	/** Hands the form its handle once the widget is ready. */
	readonly register: (handle: CaptchaWidgetHandle) => void;
	/** Reports a failed widget, so the form can offer a retry. */
	readonly onError: () => void;
};

export type CaptchaWidgetComponent<
	TOptions extends AdminOptions | undefined = undefined,
	TClient extends CaptchaClientOptions = CaptchaClientOptions,
> = Component<CaptchaWidgetProps<TOptions, TClient>>;
