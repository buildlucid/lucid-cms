import { controllerSchemas } from "../../../../schemas/documents.js";
import {
	contentDepthSchema,
	contentFallbackLocaleSchema,
	contentLocaleSchema,
} from "../../../../schemas/shared/content.js";
import { filterInputSchema, paginationSchema } from "../../schema.js";
import { normalizePaginatedDocumentQuery } from "../../utils.js";
import { documentInputSchema } from "../schema.js";

/**
 * Content list query with toolkit filters and pagination defaults, shared with the documents find
 * tool.
 */
export const querySchema =
	controllerSchemas.content.getMultiple.query.formatted.extend({
		filter: filterInputSchema,
		...paginationSchema.shape,
	});

/** Converts toolkit list options to a content service query. */
export const inputSchema = documentInputSchema
	.extend({
		locale: contentLocaleSchema.optional(),
		fallbackLocale: contentFallbackLocaleSchema.optional(),
		depth: contentDepthSchema.optional(),
		...querySchema.omit({ filterOr: true }).shape,
	})
	.transform(({ filter, sort, include, page, perPage, ...input }) => ({
		...input,
		query: normalizePaginatedDocumentQuery({
			filter,
			sort,
			include,
			page,
			perPage,
		}),
	}));
