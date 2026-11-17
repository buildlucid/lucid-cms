import type { CaptchaClientOptions, CaptchaForm } from "@lucidcms/types";
import type { ServiceContext } from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

export type CaptchaVerifyParams = {
	/** The token the browser widget produced. */
	token: string;
	/** The action the endpoint expects. Never take it from the submitted form. */
	action: string;
};

/** The outcome of checking a token. Throw instead when the provider can't be reached or rejects your credentials. */
export type CaptchaVerification =
	| {
			success: true;
			/** From 0, likely a bot, to 1, likely a person, for providers that score requests. */
			score?: number;
	  }
	| {
			success: false;
			/** Why the token failed. Logged, never shown to the person submitting the form. */
			reason: "invalid" | "expired" | "mismatch" | "low-score";
	  };

/** Factory that returns a configured adapter, synchronously or asynchronously. */
export type CaptchaAdapter<T = undefined> = T extends undefined
	? () => CaptchaAdapterInstance | Promise<CaptchaAdapterInstance>
	: (options: T) => CaptchaAdapterInstance | Promise<CaptchaAdapterInstance>;

/** Adapter contract used by Lucid. In the admin, the browser side is a `captcha.widget` admin slot matched by `key`; elsewhere it is `browserWidget`. */
export type CaptchaAdapterInstance = {
	/** The adapter type */
	type: "captcha-adapter";
	/** A unique identifier key for the adapter, which its widget slot matches */
	key: string;
	/**
	 * Lifecycle callbacks
	 */
	lifecycle?: {
		/** Initialize the adapter */
		init?: (context: AdapterLifecycleContext) => Promise<void>;
		/** Destroy the adapter */
		destroy?: (context: AdapterLifecycleContext) => Promise<void>;
	};
	/** Values the widget needs in the browser, such as a site key. Never include secrets. */
	client?: CaptchaClientOptions;
	/**
	 * A browser script, as text, that draws the widget in HTML forms outside the admin, following
	 * {@link CaptchaWidgetEventMap}. `toolkit.captcha.renderWidget` places it in the widget's element.
	 */
	browserWidget?: string;
	/** Check a token once, including its action. */
	verify: (
		context: ServiceContext,
		params: CaptchaVerifyParams,
	) => Promise<CaptchaVerification>;
};

/**
 * What a browser widget reads from its element, `data-captcha-settings` as JSON: the adapter's
 * `client` values, the action tokens must carry, and the name of the input to write tokens to.
 */
export type CaptchaWidgetSettings = CaptchaClientOptions & {
	action: string;
	field: string;
};

/**
 * How a form talks to a browser widget. The widget finds its element as the parent of its script
 * (`document.currentScript.parentElement`), draws there with {@link CaptchaWidgetSettings}, and
 * writes its token to an input named `field` in the form. Forms fire these on the element.
 */
export type CaptchaWidgetEventMap = {
	/** Fired before sending. The widget refreshes its token and hands `detail` a promise the send waits on. */
	"captcha:token": CustomEvent<(wait: Promise<unknown>) => void>;
	/** Fired after a failed send, as tokens only work once. */
	"captcha:reset": Event;
};

export type CaptchaConfig = {
	/** The captcha adapter to use. No forms are protected without one. */
	adapter?:
		| CaptchaAdapter
		| CaptchaAdapterInstance
		| Promise<CaptchaAdapterInstance>;
	/**
	 * Built-in forms to protect. With an adapter, login, magic link requests, setup, password reset requests and share-link passwords are on by default.
	 * Use `false` to protect none, such as for toolkit-only use or while a provider is down.
	 */
	forms?: false | Partial<Record<CaptchaForm, boolean>>;
};
