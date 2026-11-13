import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { describe, expect, test, vi } from "vitest";
import createSiteConfig from "./create-site-config.js";
import resolvePathLocale from "./resolve-path-locale.js";

const config = {
	url: "https://cms.example.com",
	// The de locale has no URL of its own, so it shares en's domain.
	siteUrl: { en: "/", fr: "https://example.fr" },
	localization: {
		locales: [{ code: "en" }, { code: "fr" }, { code: "de" }],
		defaultLocale: "en",
	},
	collections: [],
} as unknown as ResolvedLucidConfig;

/** The locale a request to `href` renders in. */
const requestLocale = (
	siteConfig: ReturnType<typeof createSiteConfig>,
	href: string,
) =>
	siteConfig.resolveLocale({
		path: new URL(href).pathname,
		url: new URL(href),
		header: () => null,
		cookie: () => undefined,
	});

describe("createSiteConfig", () => {
	test("renders a domain's only locale without calling the locale option", () => {
		const locale = vi.fn(() => "en");

		for (const options of [{}, { locale }]) {
			const siteConfig = createSiteConfig(
				config,
				{ locales: ["en", "fr"], ...options },
				null,
			);
			expect(requestLocale(siteConfig, "https://example.fr/a-propos")).toBe(
				"fr",
			);
			// A proxy that ends TLS can pass the request on as http with the https port on the host.
			expect(requestLocale(siteConfig, "http://example.fr:443/a-propos")).toBe(
				"fr",
			);
			expect(requestLocale(siteConfig, "https://cms.example.com/about")).toBe(
				"en",
			);
		}
		expect(locale).not.toHaveBeenCalled();
	});

	test("lets the locale option choose between locales that share a domain, with unknown hosts on the default locale's", () => {
		const siteConfig = createSiteConfig(
			config,
			{ locale: ({ path }) => (path.startsWith("/de") ? "de" : "en") },
			null,
		);

		expect(requestLocale(siteConfig, "https://cms.example.com/de/ueber")).toBe(
			"de",
		);
		expect(requestLocale(siteConfig, "https://cms.example.com/about")).toBe(
			"en",
		);
		expect(requestLocale(siteConfig, "https://other.example/de/ueber")).toBe(
			"de",
		);
		// The fr locale has its domain to itself, so the option isn't asked.
		expect(requestLocale(siteConfig, "https://example.fr/de/ueber")).toBe("fr");
		// Without the option, a shared domain renders its first locale.
		expect(
			requestLocale(
				createSiteConfig(config, {}, null),
				"https://cms.example.com/de/ueber",
			),
		).toBe("en");
	});

	test("matches a domain by the hosts of every locale on it", () => {
		const siteConfig = createSiteConfig(
			{
				...config,
				siteUrl: {
					en: "https://example.com",
					fr: "http://example.fr",
					de: "https://example.fr",
				},
			},
			{ locale: ({ path }) => (path.startsWith("/de") ? "de" : "fr") },
			null,
		);

		// The fr URL answers to port 80 and the de URL to port 443.
		expect(requestLocale(siteConfig, "http://example.fr:443/de/ueber")).toBe(
			"de",
		);
	});

	test("refuses a locale the request's domain doesn't have", () => {
		const siteConfig = createSiteConfig(config, { locale: () => "fr" }, null);

		expect(() =>
			requestLocale(siteConfig, "https://cms.example.com/about"),
		).toThrow(
			"The locale option gave 'fr' for https://cms.example.com/about, but siteUrl only puts 'en', 'de' on that domain, so the option can only choose between them.",
		);
	});

	test("leaves every site locale to the locale option when siteUrl is on one domain", () => {
		const oneDomain = {
			...config,
			siteUrl: { en: "https://example.com", fr: "https://example.com/fr" },
		};
		const byPath = createSiteConfig(
			oneDomain,
			{ locale: ({ path }) => (path.startsWith("/fr") ? "fr" : "en") },
			null,
		);

		expect(requestLocale(byPath, "https://example.com/fr/a-propos")).toBe("fr");
		expect(resolvePathLocale(byPath, "/fr/a-propos")).toBe("fr");
		expect(
			requestLocale(
				createSiteConfig(oneDomain, {}, null),
				"https://example.com/fr/a-propos",
			),
		).toBe("en");
		expect(() =>
			requestLocale(
				createSiteConfig(oneDomain, { locale: () => "es" }, null),
				"https://example.com/",
			),
		).toThrow(
			"The locale option gave 'es' for /, which isn't one of the site's locales.",
		);
	});
});
