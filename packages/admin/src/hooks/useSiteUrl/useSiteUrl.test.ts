import { createMemo, createRoot, createSignal } from "solid-js";
import { expect, test } from "vitest";
import siteStore from "@/store/siteStore/siteStore";
import { useSiteUrl } from "./useSiteUrl";

test("follows the site URL the settings response brings, after components read it", () => {
	createRoot((dispose) => {
		const siteUrl = useSiteUrl();
		const host = createMemo(() => {
			const url = siteUrl();
			return url ? new URL(url).host : null;
		});
		expect(host()).toBeNull();

		siteStore.setSite({ url: "https://example.com/", locales: {} });

		expect(host()).toBe("example.com");
		dispose();
	});
	siteStore.get.reset();
});

test("gives a locale's own URL, and the default locale's to locales without one", () => {
	createRoot((dispose) => {
		const [locale, setLocale] = createSignal<string | null>("fr");
		const siteUrl = useSiteUrl(locale);
		siteStore.setSite({
			url: "https://example.com/",
			locales: { en: "https://example.com/", fr: "https://example.fr/" },
		});
		expect(siteUrl()).toBe("https://example.fr/");

		setLocale("de");
		expect(siteUrl()).toBe("https://example.com/");
		setLocale(null);
		expect(siteUrl()).toBe("https://example.com/");
		dispose();
	});
	siteStore.get.reset();
});
