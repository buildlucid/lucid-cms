import { defineAdminSlot } from "@lucidcms/core";
import type {
	AuthProvider,
	CaptchaAdapterInstance,
	LucidConfig,
} from "@lucidcms/core/types";
import type { Variant } from "../variants.ts";

/** The providers every setup offers, which sign in through the harness's identity provider. */
export const PROVIDERS = {
	/** OAuth 2.0, with Lucid's two-factor step. */
	oauth: "harness-oauth",
	/** OpenID Connect, which skips Lucid's two-factor step with `bypassTwoFactor`. */
	oidc: "harness-oidc",
} as const;

/** What the identity provider checks a provider's token requests against. */
export const PROVIDER_CLIENT_SECRET = "harness-client-secret";

/** The only token the `captcha` variant's adapter accepts. */
export const CAPTCHA_TOKEN = "harness-captcha-pass";

/** The `captcha` variant's adapter key. */
export const CAPTCHA_ADAPTER_KEY = "harness-captcha";

/** Where providers point without `HARNESS_IDP_URL`, so the CLI and tests see the same providers. Nothing answers it. */
const UNREACHABLE_IDP = "http://127.0.0.1:9/idp";

const providers = (idp: string): AuthProvider[] => [
	{
		key: PROVIDERS.oauth,
		name: "Harness OAuth",
		enabled: true,
		type: "oauth2",
		config: {
			type: "oauth2",
			clientId: PROVIDERS.oauth,
			clientSecret: PROVIDER_CLIENT_SECRET,
			authorizationEndpoint: `${idp}/authorize`,
			tokenEndpoint: `${idp}/token`,
			userinfoEndpoint: `${idp}/userinfo`,
		},
	},
	{
		key: PROVIDERS.oidc,
		name: "Harness OIDC",
		enabled: true,
		bypassTwoFactor: true,
		type: "oidc",
		config: {
			type: "oidc",
			issuer: idp,
			clientId: PROVIDERS.oidc,
			clientSecret: PROVIDER_CLIENT_SECRET,
			authorizationEndpoint: `${idp}/authorize`,
		},
	},
];

const captchaAdapter: CaptchaAdapterInstance = {
	type: "captcha-adapter",
	key: CAPTCHA_ADAPTER_KEY,
	verify: async (_context, params) =>
		params.token === CAPTCHA_TOKEN
			? { success: true }
			: { success: false, reason: "invalid" },
};

/**
 * The browser side Lucid requires of a captcha adapter. The `captcha` variant only runs in host
 * mode, where the admin isn't built, so the component is never loaded.
 */
const captchaWidget = defineAdminSlot({
	key: `${CAPTCHA_ADAPTER_KEY}:widget`,
	slot: "captcha.widget",
	match: { adapter: CAPTCHA_ADAPTER_KEY },
	component: { module: "harness-captcha-widget", export: "Widget" },
});

/**
 * Enables passwords, magic links, passkeys, optional two-factor authentication and two providers
 * from `HARNESS_IDP_URL`. Requires `outbox` for magic links; `HARNESS_VARIANT` adjusts the config.
 */
export const authentication = (env: {
	HARNESS_IDP_URL?: string;
	HARNESS_VARIANT?: Variant;
}) =>
	({
		auth: {
			password: { enabled: env.HARNESS_VARIANT !== "passwordless" },
			magicLink: { enabled: true },
			providers: providers(env.HARNESS_IDP_URL ?? UNREACHABLE_IDP),
		},
		captcha:
			env.HARNESS_VARIANT === "captcha" ? { adapter: captchaAdapter } : {},
		admin: {
			slots: env.HARNESS_VARIANT === "captcha" ? [captchaWidget] : [],
		},
	}) satisfies Pick<LucidConfig, "auth" | "captcha" | "admin">;
