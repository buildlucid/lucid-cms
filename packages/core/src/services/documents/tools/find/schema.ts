import z from "zod";
import { querySchema } from "../../../../libs/toolkit/documents/get-multiple/schema.js";
import { normalizePaginatedDocumentQuery } from "../../../../libs/toolkit/utils.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { documentRouteSchema } from "../../helpers/project-document.js";

export const inputSchema = z.object({
	collectionKey: z.string().min(1),
	version: z.string().trim().min(1).default("latest").meta({
		description: "Content version, usually latest or a publishing target.",
	}),
	contentLocale: z.string().min(1).optional().meta({
		description:
			"Content language to return. Defaults to the collection's content language.",
	}),
	fieldKeys: z.array(z.string().min(1)).optional().meta({
		description: "Only return these top-level content fields.",
	}),
	query: querySchema
		.extend(paginationInput)
		.prefault({})
		.transform(normalizePaginatedDocumentQuery)
		.meta({
			description:
				"Content query with nested AND/OR filters, sort, includes and pagination (perPage max 50). Prefix custom field keys with _, including routing.field: for example {_fullSlug:{operator:'starts-with',value:'/blog/'}}. Brick and repeater fields use nested keys.",
		}),
});

export const outputSchema = z.object({
	data: z
		.array(
			z.object({
				id: z.number().meta({ description: "Document ID for documents_get." }),
				collectionKey: z
					.string()
					.meta({ description: "Owning collection key." }),
				version: z
					.string()
					.nullable()
					.meta({ description: "Resolved content version." }),
				route: documentRouteSchema,
				fields: z.record(z.string(), z.unknown()).meta({
					description: "Selected label fields or requested fieldKeys.",
				}),
				bricks: z
					.unknown()
					.optional()
					.meta({ description: "Bricks when query.include requests them." }),
				links: z
					.object({ edit: z.string() })
					.meta({ description: "Admin editor link." }),
			}),
		)
		.meta({ description: "Matching document summaries for this page." }),
	pagination: paginationSchema,
	meta: z
		.object({
			collectionKey: z.string().meta({ description: "Queried collection." }),
			version: z.string().meta({ description: "Queried content version." }),
			contentLocale: z.string().nullable().meta({
				description:
					"Selected content language, independent of interface language.",
			}),
			refs: z
				.unknown()
				.optional()
				.meta({ description: "Scoped references requested by query.include." }),
		})
		.meta({ description: "Query context and optional scoped references." }),
});
