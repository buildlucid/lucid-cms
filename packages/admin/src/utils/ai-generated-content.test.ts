import { describe, expect, test } from "vitest";
import {
	generatedContentEntries,
	mediaGenerationValue,
} from "./ai-generated-content";

describe("AI editor values", () => {
	test("keeps unassigned JSON values whole and real locale keys separate", () => {
		expect(
			generatedContentEntries({ kind: "value", value: { de: "Property" } }),
		).toEqual([[null, { de: "Property" }]]);
		expect(
			generatedContentEntries({
				kind: "translations",
				translations: { de: "Text" },
			}),
		).toEqual([["de", "Text"]]);
	});

	test("sends media context as a scalar or a locale record without dropping empty text", () => {
		expect(mediaGenerationValue([{ localeCode: null, value: "" }])).toBe("");
		expect(
			mediaGenerationValue([
				{ localeCode: "de", value: "" },
				{ localeCode: "fr", value: "Texte" },
			]),
		).toEqual({ de: "", fr: "Texte" });
		expect(mediaGenerationValue(undefined)).toBeUndefined();
	});
});
