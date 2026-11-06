import z from "zod";
import type { TranslationSource } from "../../types/response.js";

/** What a translated value was made from, as stored per field and locale. */
export const translationSourceSchema = z
	.object({
		source: z.string().min(1).max(64),
		origin: z.enum(["ai", "person"]),
		output: z.string().min(1).max(64).optional(),
	})
	.meta({
		description:
			"What a translation was made from: a hash of the default locale's text, who wrote it and, for the translation feature, a hash of what it wrote",
	}) satisfies z.ZodType<TranslationSource>;
