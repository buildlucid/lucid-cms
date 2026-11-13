import { expect, test } from "vitest";
import matchRequestOrigin from "./match-request-origin.js";
import resolveSiteUrls, { type SiteUrls } from "./resolve-site-urls.js";

const siteUrls = resolveSiteUrls({
	url: "https://cms.example.com",
	siteUrl: { en: "https://example.com", fr: "https://example.fr" },
	localization: {
		locales: [
			{ label: "English", code: "en" },
			{ label: "French", code: "fr" },
		],
		defaultLocale: "en",
	},
}) as SiteUrls;

test("picks the configured origin the request's host is on, whatever scheme a proxy left it", () => {
	expect(matchRequestOrigin(siteUrls, "https://example.fr/sitemap.xml")).toBe(
		"https://example.fr",
	);
	//* a proxy that ends TLS hands Lucid an http URL, sometimes with the original port on the host
	expect(matchRequestOrigin(siteUrls, "http://example.fr/robots.txt")).toBe(
		"https://example.fr",
	);
	expect(matchRequestOrigin(siteUrls, "http://example.fr:443/robots.txt")).toBe(
		"https://example.fr",
	);
});

test("gives any other host the default locale's origin, never its own", () => {
	expect(matchRequestOrigin(siteUrls, "http://localhost:6543/robots.txt")).toBe(
		"https://example.com",
	);
	expect(
		matchRequestOrigin(siteUrls, "https://attacker.example/sitemap.xml"),
	).toBe("https://example.com");
});
