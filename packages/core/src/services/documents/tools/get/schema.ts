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
import { documentIdInput } from "../schema.js";

export const inputSchema = z.object({
	collectionKey: z.string().min(1),
	documentId: documentIdInput,
	version: z.string().trim().min(1).default("latest").meta({
		description: "Content version, usually latest or an environment.",
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

/** Agents also read request proposals as the version `request:ID`, and any of the document's versions as `version:ID`. */
export const agentInputSchema = inputSchema.extend({
	version: inputSchema.shape.version.meta({
		description:
			"Content version: latest, an environment, request:ID for the document's proposal in that request, eg. request:12 for one opened by documents_create or documents_update, or version:ID for one of the document's versions, eg. the version_id of a document_history screen.",
	}),
});

/** The request or version ID a `request:ID` or `version:ID` version names. */
export const parseAgentVersion = (version: string) => {
	const match = /^(request|version):(\d+)$/.exec(version);
	if (!match) return undefined;
	return {
		kind: match[1] === "request" ? "request" : "version",
		id: Number(match[2]),
	} as const;
};

/** A brick in the shape the write tools accept. */
export const brickSchema = z.object({
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
			requestId: z.number().nullable().meta({
				description: "The request whose proposal or snapshot was read.",
			}),
			route: documentRouteSchema,
			fields: z.record(z.string(), z.unknown()).meta({
				description:
					"Selected field values in the content language. Rich text is HTML and repeater items keep their refs.",
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
