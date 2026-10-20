import { controllerSchemas } from "../../../../schemas/documents.js";
import {
	contentDepthSchema,
	contentFallbackLocaleSchema,
	contentLocaleSchema,
} from "../../../../schemas/shared/content.js";
import { paginationSchema } from "../../schema.js";
import { normalizePaginatedDocumentQuery } from "../../utils.js";
import { documentFilterSchema, documentInputSchema } from "../schema.js";

export const querySchema =
	controllerSchemas.content.getMultiple.query.formatted.extend({
		filter: documentFilterSchema,
		...paginationSchema.shape,
	});

export const inputSchema = documentInputSchema.extend({
	locale: contentLocaleSchema.optional(),
	fallbackLocale: contentFallbackLocaleSchema.optional(),
	depth: contentDepthSchema.optional(),
	query: querySchema.prefault({}).transform(normalizePaginatedDocumentQuery),
});
