import { controllerSchemas } from "../../../../schemas/documents.js";
import { paginationSchema } from "../../schema.js";
import { normalizePaginatedDocumentQuery } from "../../utils.js";
import { documentFilterSchema, documentInputSchema } from "../schema.js";

export const querySchema =
	controllerSchemas.content.getMultiple.query.formatted.extend({
		filter: documentFilterSchema,
		...paginationSchema.shape,
	});

export const inputSchema = documentInputSchema.extend({
	query: querySchema.prefault({}).transform(normalizePaginatedDocumentQuery),
});
