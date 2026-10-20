import z from "zod";
import {
	contentFallbackLocaleSchema,
	contentLocaleSchema,
} from "../../../../schemas/shared/content.js";
import { libraryOnlySchema, mediaActorSchema } from "../schema.js";

export const inputSchema = z.object({
	id: z.number().int().positive(),
	actor: mediaActorSchema,
	libraryOnly: libraryOnlySchema,
	locale: contentLocaleSchema.optional(),
	fallbackLocale: contentFallbackLocaleSchema.optional(),
});
