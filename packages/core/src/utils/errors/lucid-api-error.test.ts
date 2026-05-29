import { expect, test } from "vitest";
import z from "zod";
import { createTranslator, text, zodTextIssue } from "../../libs/i18n/index.js";
import LucidAPIError from "./lucid-api-error.js";
import translateErrorData from "./translate-error-data.js";

test("zod issues can preserve translatable text through API error translation", () => {
	const invalidSlugMessage = text.server("tests.slug.invalid", {
		defaultMessage: "Invalid slug",
	});
	const schema = z.object({
		slug: z.string().superRefine((_, ctx) => {
			ctx.addIssue({
				code: "custom",
				...zodTextIssue(invalidSlugMessage),
			});
		}),
	});

	const result = schema.safeParse({ slug: "not valid" });
	if (result.success) throw new Error("Expected schema validation to fail");

	const error = new LucidAPIError({
		type: "validation",
		zod: result.error,
	});

	expect(error.error.errors).toEqual({
		slug: {
			code: "custom",
			message: invalidSlugMessage,
		},
	});

	const translated = translateErrorData(
		error.error,
		createTranslator({
			config: {
				i18n: {
					translations: {
						en: {
							admin: {},
							server: {
								"tests.slug.invalid": "Translated invalid slug",
							},
						},
					},
					interface: {
						defaultLocale: "en",
					},
				},
			},
			locale: "en",
		}),
	);

	expect(translated.errors).toEqual({
		slug: {
			code: "custom",
			message: "Translated invalid slug",
		},
	});
});
