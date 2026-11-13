import type { ResolvedLucidConfig } from "../../../types/config.js";

/** Checks a `siteUrl` given per locale: the default locale needs a URL, and every key must be a content locale. */
const checkSiteUrl = (
	config: Pick<ResolvedLucidConfig, "siteUrl" | "localization">,
) => {
	const { siteUrl, localization } = config;
	if (siteUrl === undefined || typeof siteUrl === "string") return;

	const { defaultLocale } = localization;
	if (defaultLocale === null) {
		throw new Error(
			"siteUrl gives a URL per locale, but no content locales are configured. Use a single URL, or add localization.locales.",
		);
	}

	const codes = localization.locales.map((locale) => locale.code);
	const unknown = Object.keys(siteUrl).find((code) => !codes.includes(code));
	if (unknown !== undefined) {
		throw new Error(
			`siteUrl has a URL for '${unknown}', which isn't one of the content locales (${codes.join(", ")}).`,
		);
	}

	if (siteUrl[defaultLocale] === undefined) {
		throw new Error(
			`siteUrl needs a URL for the default locale '${defaultLocale}', which locales without their own URL use.`,
		);
	}
};

export default checkSiteUrl;
