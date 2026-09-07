import { controllerSchemas } from "../../../../schemas/documents.js";
import { normalizeDocumentQuery } from "../../utils.js";
import { documentFilterSchema, documentInputSchema } from "../schema.js";

export const querySchema =
	controllerSchemas.content.getSingle.query.formatted.extend({
		filter: documentFilterSchema,
	});

export const inputSchema = documentInputSchema.extend({
	query: querySchema.prefault({}).transform(normalizeDocumentQuery),
});
