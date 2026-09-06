import { describe, expect, test } from "vitest";
import z from "zod";
import { generatedContentSchema } from "./generated-content.js";

describe("generated content", () => {
	test("keeps a JSON value distinct from a translation record", () => {
		const schema = generatedContentSchema(z.unknown(), null);
		const output = { kind: "value", value: { de: "A JSON property" } };
		expect(schema.parse(output)).toEqual(output);
		expect(schema.safeParse({ kind: "value", value: null }).success).toBe(true);
		expect(schema.safeParse({ kind: "value" }).success).toBe(false);
		expect(
			schema.safeParse({ kind: "translations", translations: { de: "Text" } })
				.success,
		).toBe(false);
	});

	test("requires exactly the requested translations and validates their values", () => {
		const schema = generatedContentSchema(z.string(), ["de", "fr"]);
		expect(
			schema.safeParse({
				kind: "translations",
				translations: { de: "", fr: "Texte" },
			}).success,
		).toBe(true);
		for (const translations of [
			{ de: "Text" },
			{ de: "Text", fr: "Texte", en: "Text" },
			{ de: null, fr: "Texte" },
		]) {
			expect(
				schema.safeParse({ kind: "translations", translations }).success,
			).toBe(false);
		}
		expect(schema.safeParse({ kind: "value", value: "Text" }).success).toBe(
			false,
		);
	});
});
