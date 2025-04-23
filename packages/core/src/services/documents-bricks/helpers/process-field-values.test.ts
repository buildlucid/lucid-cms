import { describe, it, expect } from "vitest";
import processFieldValues from "./process-field-values.js";
import type { FieldInputSchema } from "../../../types";

describe("testing processFieldValues", () => {
	const defaultLocale = "en";
	const locales = ["en", "fr", "de"];

	it("should process field with translations for all locales", () => {
		const field: FieldInputSchema = {
			key: "title",
			type: "text",
			translations: {
				en: "Hello",
				fr: "Bonjour",
				de: "Hallo",
			},
		};

		const result = processFieldValues(field, locales, defaultLocale);

		expect(result.size).toBe(3);
		expect(result.get("en")).toBe("Hello");
		expect(result.get("fr")).toBe("Bonjour");
		expect(result.get("de")).toBe("Hallo");
	});

	it("should process field with partial translations and set missing locales to null", () => {
		const field: FieldInputSchema = {
			key: "description",
			type: "textarea",
			translations: {
				en: "English description",
				fr: "Description française",
				//* note - german translation is missing
			},
		};

		const result = processFieldValues(field, locales, defaultLocale);

		expect(result.size).toBe(3);
		expect(result.get("en")).toBe("English description");
		expect(result.get("fr")).toBe("Description française");
		expect(result.get("de")).toBe(null);
	});

	it("should process field with a single value and apply to default locale only", () => {
		const field: FieldInputSchema = {
			key: "published",
			type: "checkbox",
			value: true,
		};

		const result = processFieldValues(field, locales, defaultLocale);

		expect(result.size).toBe(3);
		expect(result.get("en")).toBe(true);
		expect(result.get("fr")).toBe(null);
		expect(result.get("de")).toBe(null);
	});

	it("should process field with neither value nor translations and set all locales to null", () => {
		const field: FieldInputSchema = {
			key: "image",
			type: "media",
		};

		const result = processFieldValues(field, locales, defaultLocale);

		expect(result.size).toBe(3);
		expect(result.get("en")).toBe(null);
		expect(result.get("fr")).toBe(null);
		expect(result.get("de")).toBe(null);
	});

	it("should handle complex field values", () => {
		const field: FieldInputSchema = {
			key: "link",
			type: "link",
			translations: {
				en: {
					url: "https://example.com",
					label: "Visit site",
					target: "_blank",
				},
				fr: {
					url: "https://example.fr",
					label: "Visiter le site",
					target: "_self",
				},
			},
		};

		const result = processFieldValues(field, locales, defaultLocale);

		expect(result.size).toBe(3);
		expect(result.get("en")).toEqual({
			url: "https://example.com",
			label: "Visit site",
			target: "_blank",
		});
		expect(result.get("fr")).toEqual({
			url: "https://example.fr",
			label: "Visiter le site",
			target: "_self",
		});
		expect(result.get("de")).toBe(null);
	});

	it("should handle null values in translations", () => {
		const field: FieldInputSchema = {
			key: "optional",
			type: "text",
			translations: {
				en: "Has value",
				fr: null,
				de: undefined,
			},
		};

		const result = processFieldValues(field, locales, defaultLocale);

		expect(result.size).toBe(3);
		expect(result.get("en")).toBe("Has value");
		expect(result.get("fr")).toBe(null);
		expect(result.get("de")).toBe(null);
	});
});
