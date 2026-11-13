import { describe, expect, test } from "vitest";
import getSiteUrl, { type SiteUrlConfig } from "./get-site-url.js";
import getSiteUrls from "./get-site-urls.js";

const localization: SiteUrlConfig["localization"] = {
	locales: [
		{ label: "English", code: "en" },
		{ label: "French", code: "fr" },
		{ label: "German", code: "de" },
	],
	defaultLocale: "en",
};
const config: SiteUrlConfig = {
	url: "https://cms.example.com",
	siteUrl: { en: "/", fr: "https://example.fr/" },
	localization,
};

describe("getSiteUrl", () => {
	test("resolves a locale's URL, paths against the CMS, and the default locale's for the rest", () => {
		expect(getSiteUrl(config, "fr")).toBe("https://example.fr/");
		expect(getSiteUrl(config, "en")).toBe("https://cms.example.com/");
		expect(getSiteUrl(config, "de")).toBe("https://cms.example.com/");
		expect(getSiteUrl(config)).toBe("https://cms.example.com/");
		expect(getSiteUrl({ ...config, siteUrl: "/site" }, "fr")).toBe(
			"https://cms.example.com/site",
		);
		expect(getSiteUrl({ ...config, siteUrl: undefined }, "fr")).toBeNull();
	});
});

describe("getSiteUrls", () => {
	test("lists every content locale's URL", () => {
		expect(getSiteUrls(config)).toEqual({
			en: "https://cms.example.com/",
			fr: "https://example.fr/",
			de: "https://cms.example.com/",
		});
		expect(
			getSiteUrls({
				url: config.url,
				siteUrl: "https://example.com",
				localization: { locales: [], defaultLocale: null },
			}),
		).toEqual({});
	});
});
