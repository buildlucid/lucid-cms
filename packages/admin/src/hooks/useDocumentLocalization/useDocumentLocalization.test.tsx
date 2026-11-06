import type { Collection, Locale } from "@types";
import { render } from "solid-js/web";
import { afterEach, expect, test } from "vitest";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import {
	DocumentLocalizationProvider,
	useDocumentLocalization,
} from "./useDocumentLocalization";

const collection = {
	localized: { locales: ["en", "fr", "de"], defaultLocale: "en" },
} as Collection;

const locale = (code: string, name: string): Locale => ({
	code,
	name,
	direction: "ltr",
	isDefault: code === "en",
	createdAt: null,
	updatedAt: null,
});

const cleanups: Array<() => void> = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
});

test("a locale-limited proposal opens in its locale, and other locales can still be viewed", () => {
	contentLocaleStore.set("locales", [
		locale("en", "English"),
		locale("fr", "French"),
		locale("de", "German"),
	]);
	contentLocaleStore.get.setContentLocale("en");

	let localization: ReturnType<typeof useDocumentLocalization> | undefined;
	const container = document.createElement("div");
	cleanups.push(
		render(
			() => (
				<DocumentLocalizationProvider
					collection={() => collection}
					editableLocales={() => ["fr"]}
				>
					{(() => {
						localization = useDocumentLocalization();
						return null;
					})()}
				</DocumentLocalizationProvider>
			),
			container,
		),
	);
	expect(localization?.contentLocale()).toBe("fr");

	contentLocaleStore.get.setContentLocale("de");
	expect(localization?.contentLocale()).toBe("de");
	expect(localization?.editableLocales()).toEqual(["fr"]);
});
