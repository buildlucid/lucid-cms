import { controllerSchemas } from "../../../../schemas/documents.js";
import {
	contentDepthSchema,
	contentFallbackLocaleSchema,
	contentLocaleSchema,
} from "../../../../schemas/shared/content.js";
import { filterInputSchema } from "../../schema.js";
import { normalizeDocumentQuery } from "../../utils.js";
import { documentInputSchema } from "../schema.js";

const querySchema = controllerSchemas.content.getSingle.query.formatted
	.omit({ filterOr: true })
	.extend({ filter: filterInputSchema });

/** Converts toolkit read options to a content service query. */
export const inputSchema = documentInputSchema
	.extend({
		locale: contentLocaleSchema.optional(),
		fallbackLocale: contentFallbackLocaleSchema.optional(),
		depth: contentDepthSchema.optional(),
		...querySchema.shape,
	})
	.transform(({ filter, include, ...input }) => ({
		...input,
		query: normalizeDocumentQuery({ filter, include }),
	}));
