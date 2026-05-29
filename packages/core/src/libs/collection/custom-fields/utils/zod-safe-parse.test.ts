import { expect, test } from "vitest";
import z from "zod";
import { text, zodTextIssue } from "../../../i18n/index.js";
import zodSafeParse from "./zod-safe-parse.js";

test("returns translatable text from Lucid zod issues", () => {
	const invalidSlugMessage = text.server("tests.slug.invalid", {
		defaultMessage: "Invalid slug",
	});
	const schema = z.string().superRefine((_, ctx) => {
		ctx.addIssue({
			code: "custom",
			...zodTextIssue(invalidSlugMessage),
		});
	});

	expect(zodSafeParse("not valid", schema)).toEqual({
		valid: false,
		message: invalidSlugMessage,
	});
});
