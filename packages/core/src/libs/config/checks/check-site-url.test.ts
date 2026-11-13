import { expect, test } from "vitest";
import checkSiteUrl from "./check-site-url.js";

const localization = {
	locales: [
		{ label: "English", code: "en" },
		{ label: "French", code: "fr" },
	],
	defaultLocale: "en",
};

test("a URL per locale needs the default locale and only content locales", () => {
	expect(() =>
		checkSiteUrl({
			siteUrl: { en: "/", fr: "https://example.fr" },
			localization,
		}),
	).not.toThrow();
	//* fr has no URL of its own, so it uses en's
	expect(() =>
		checkSiteUrl({ siteUrl: { en: "https://example.com" }, localization }),
	).not.toThrow();

	expect(() =>
		checkSiteUrl({ siteUrl: { fr: "https://example.fr" }, localization }),
	).toThrow("siteUrl needs a URL for the default locale 'en'");
	expect(() =>
		checkSiteUrl({
			siteUrl: { en: "https://example.com", de: "https://example.de" },
			localization,
		}),
	).toThrow(
		"siteUrl has a URL for 'de', which isn't one of the content locales (en, fr).",
	);
	expect(() =>
		checkSiteUrl({
			siteUrl: { en: "https://example.com" },
			localization: { locales: [], defaultLocale: null },
		}),
	).toThrow("no content locales are configured");
});
