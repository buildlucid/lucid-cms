export const PLUGIN_KEY = "@lucidcms/plugin-google-recaptcha";
export const LUCID_VERSION = "0.x.x";
export const PLUGIN_IDENTIFIER = "google-recaptcha";
export const COMPONENTS_MODULE = "@lucidcms/plugin-google-recaptcha/components";
export const SCRIPT_URL = "https://www.google.com/recaptcha/enterprise.js";
export const ASSESSMENTS_URL =
	"https://recaptchaenterprise.googleapis.com/v1/projects";
export const VERIFY_TIMEOUT = 10_000;
export const DEFAULT_MIN_SCORE = 0.5;
export const CSP_SOURCES = {
	scriptSrc: [
		"https://www.google.com/recaptcha/",
		"https://www.gstatic.com/recaptcha/",
	],
	frameSrc: [
		"https://www.google.com/recaptcha/",
		"https://recaptcha.google.com/recaptcha/",
	],
	connectSrc: ["https://www.google.com/recaptcha/"],
};
