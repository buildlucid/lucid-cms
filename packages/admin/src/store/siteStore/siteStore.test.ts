import { afterEach, expect, test } from "vitest";
import siteStore from "./siteStore";

afterEach(() => {
	siteStore.get.reset();
});

test("drops locale website URLs a later settings load or a reset no longer has", () => {
	const locales = { en: "https://example.com/", fr: "https://example.fr/" };
	siteStore.setSite({ url: "https://example.com/", locales });
	expect(siteStore.get.getSiteUrl("fr")).toBe("https://example.fr/");

	siteStore.setSite({
		url: "https://example.com/",
		locales: { en: "https://example.com/" },
	});
	expect(siteStore.get.getSiteUrl("fr")).toBe("https://example.com/");

	siteStore.setSite({ url: "https://example.com/", locales });
	siteStore.get.reset();
	expect(siteStore.get.siteUrls).toEqual({});
	expect(siteStore.get.getSiteUrl("fr")).toBeNull();
});
