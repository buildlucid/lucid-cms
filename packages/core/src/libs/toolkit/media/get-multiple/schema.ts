import z from "zod";
import { controllerSchemas } from "../../../../schemas/media.js";
import {
	contentFallbackLocaleSchema,
	contentLocaleSchema,
} from "../../../../schemas/shared/content.js";
import { filterInputSchema, paginationSchema } from "../../schema.js";
import { libraryOnlySchema, mediaActorSchema } from "../schema.js";

/** Validates flattened filters against the media service's list query. */
export const querySchema = controllerSchemas.getMultiple.query.formatted.extend(
	paginationSchema.shape,
);

export const inputSchema = z.strictObject({
	filter: filterInputSchema,
	sort: querySchema.shape.sort,
	include: querySchema.shape.include,
	...paginationSchema.shape,
	actor: mediaActorSchema,
	libraryOnly: libraryOnlySchema,
	locale: contentLocaleSchema.optional(),
	fallbackLocale: contentFallbackLocaleSchema.optional(),
});
