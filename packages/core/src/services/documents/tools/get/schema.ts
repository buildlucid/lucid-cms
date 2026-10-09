import z from "zod";
import { querySchema } from "../../../../libs/toolkit/documents/get-single/schema.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import {
	documentMetaSchema,
	documentRefsSchema,
	documentRouteSchema,
} from "../../helpers/project-document.js";

export const inputSchema = z.object({
	collectionKey: z.string().min(1),
	id: z.number().int().positive(),
	version: z.string().trim().min(1).default("latest").meta({
		description:
			"Content version, usually latest or a publishing target. Ignored with requestId.",
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
	include: querySchema.shape.include.default(["bricks", "meta"]).meta({
		description:
			"What to return besides fields: bricks, meta (versions and authors), and refs to the documents, media and users the content links to.",
	}),
});

export const agentInputSchema = inputSchema.extend({
	requestId: z.number().int().positive().optional().meta({
		description:
			"Read the document's proposal in this request instead, eg. one opened by documents_create or documents_update.",
	}),
});

/** A brick in the shape the write tools accept. */
const brickSchema = z.object({
	ref: z.string().optional().meta({
		description:
			"Stable ref for builder and embedded bricks. Fixed bricks use their key.",
	}),
	key: z.string(),
	type: z.enum(["fixed", "builder", "embedded"]),
	fields: z.record(z.string(), z.unknown()),
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
			requestId: z
				.number()
				.nullable()
				.meta({ description: "The request whose proposal was read." }),
			route: documentRouteSchema,
			fields: z.record(z.string(), z.unknown()).meta({
				description:
					"Selected field values in the content language, as documents_update accepts them. Rich text is HTML and repeater items keep their refs.",
			}),
			bricks: z.array(brickSchema).meta({
				description:
					"Selected page of bricks: fixed, then builder in page order, then embedded.",
			}),
			meta: documentMetaSchema
				.optional()
				.meta({ description: "Content version metadata when requested." }),
			links: z
				.object({ edit: z.string() })
				.meta({ description: "Admin editor or request link." }),
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
			refs: documentRefsSchema
				.optional()
				.meta({ description: "Scoped references requested by include." }),
		})
		.meta({
			description: "Read context, brick pagination and optional references.",
		}),
});
