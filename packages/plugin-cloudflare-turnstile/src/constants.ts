export const PLUGIN_KEY = "@lucidcms/plugin-cloudflare-turnstile";
export const LUCID_VERSION = "0.x.x";
export const PLUGIN_IDENTIFIER = "cloudflare-turnstile";
export const COMPONENTS_MODULE =
	"@lucidcms/plugin-cloudflare-turnstile/components";
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
export const SCRIPT_URL = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;
export const SITEVERIFY_URL = `${TURNSTILE_ORIGIN}/turnstile/v0/siteverify`;
export const VERIFY_TIMEOUT = 10_000;
export const MAX_TOKEN_LENGTH = 2048;
