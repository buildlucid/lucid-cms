import { controllerSchemas } from "../../../../schemas/documents.js";
import {
	contentDepthSchema,
	contentFallbackLocaleSchema,
	contentLocaleSchema,
} from "../../../../schemas/shared/content.js";
import { normalizeDocumentQuery } from "../../utils.js";
import { documentFilterSchema, documentInputSchema } from "../schema.js";

export const querySchema =
	controllerSchemas.content.getSingle.query.formatted.extend({
		filter: documentFilterSchema,
	});

export const inputSchema = documentInputSchema.extend({
	locale: contentLocaleSchema.optional(),
	fallbackLocale: contentFallbackLocaleSchema.optional(),
	depth: contentDepthSchema.optional(),
	query: querySchema.prefault({}).transform(normalizeDocumentQuery),
});
