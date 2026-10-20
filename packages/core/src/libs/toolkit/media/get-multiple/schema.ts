import z from "zod";
import { controllerSchemas } from "../../../../schemas/media.js";
import {
	contentFallbackLocaleSchema,
	contentLocaleSchema,
} from "../../../../schemas/shared/content.js";
import { paginationSchema } from "../../schema.js";
import { libraryOnlySchema, mediaActorSchema } from "../schema.js";

export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = z.object({
	query: querySchema.prefault({}),
	actor: mediaActorSchema,
	libraryOnly: libraryOnlySchema,
	locale: contentLocaleSchema.optional(),
	fallbackLocale: contentFallbackLocaleSchema.optional(),
});
