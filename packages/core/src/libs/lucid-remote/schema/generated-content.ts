import z from "zod";

/** Validates the output shape and, when supplied, the exact requested locales. */
export const generatedContentSchema = <T extends z.ZodType>(
	value: T,
	targetLocales?: readonly string[] | null,
) =>
	z
		.discriminatedUnion("kind", [
			z.object({ kind: z.literal("value"), value }).strict(),
			z
				.object({
					kind: z.literal("translations"),
					translations: z.record(z.string().min(2).max(32), value),
				})
				.strict(),
		])
		.superRefine((content, context) => {
			if (content.kind === "value" && !Object.hasOwn(content, "value")) {
				context.addIssue({
					code: "custom",
					message: "A generated value is required.",
				});
			}
			if (targetLocales === undefined) return;
			const translations =
				"translations" in content ? content.translations : undefined;
			const matches =
				targetLocales === null
					? content.kind === "value"
					: translations !== undefined &&
						Object.keys(translations).length === targetLocales.length &&
						targetLocales.every((locale) =>
							Object.hasOwn(translations, locale),
						);
			if (!matches)
				context.addIssue({
					code: "custom",
					message: "Generated content must match the requested locales.",
				});
		});
