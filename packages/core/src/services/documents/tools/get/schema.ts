import z from "zod";
import { querySchema } from "../../../../libs/toolkit/documents/get-single/schema.js";
import { normalizeDocumentQuery } from "../../../../libs/toolkit/utils.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { documentRouteSchema } from "../../helpers/project-document.js";

export const inputSchema = z.object({
	collectionKey: z.string().min(1),
	id: z.number().int().positive(),
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
	bricksPage: paginationInput.page,
	bricksPerPage: paginationInput.perPage,
	query: querySchema
		.prefault({ include: ["bricks", "meta"] })
		.transform(normalizeDocumentQuery)
		.meta({
			description:
				"Additional content filters and includes using the toolkit query shape.",
		}),
});

export const outputSchema = z.object({
	data: z
		.object({
			id: z.number().meta({ description: "Document ID." }),
			collectionKey: z.string().meta({ description: "Owning collection key." }),
			version: z
				.string()
				.nullable()
				.meta({ description: "Resolved content version." }),
			route: documentRouteSchema,
			fields: z
				.record(z.string(), z.unknown())
				.meta({ description: "Selected content field values." }),
			bricks: z
				.array(
					z.object({
						id: z.number(),
						ref: z.string(),
						key: z.string(),
						type: z.enum(["builder", "fixed", "embedded"]),
						order: z.number(),
						fields: z.record(z.string(), z.unknown()),
					}),
				)
				.meta({ description: "Selected page of content bricks." }),
			meta: z
				.unknown()
				.optional()
				.meta({ description: "Content version metadata when requested." }),
			links: z
				.object({ edit: z.string() })
				.meta({ description: "Admin editor link." }),
		})
		.meta({ description: "Requested document content." }),
	meta: z
		.object({
			collectionKey: z.string().meta({ description: "Queried collection." }),
			version: z.string().meta({ description: "Queried content version." }),
			contentLocale: z.string().nullable().meta({
				description:
					"Selected content language, independent of interface language.",
			}),
			brickPagination: paginationSchema.meta({
				description: "Pagination for the data.bricks array.",
			}),
			refs: z
				.unknown()
				.optional()
				.meta({ description: "Scoped references requested by query.include." }),
		})
		.meta({
			description: "Read context, brick pagination and optional references.",
		}),
});
