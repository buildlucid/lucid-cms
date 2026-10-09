import z from "zod";
import { querySchema } from "../../../../libs/toolkit/documents/get-multiple/schema.js";
import {
	filterConditionsInput,
	toQueryFilters,
} from "../../../../libs/tools/filter-conditions.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import {
	documentRefsSchema,
	documentRouteSchema,
} from "../../helpers/project-document.js";

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
		.omit({ filter: true })
		.extend({
			filter: filterConditionsInput(z.string().min(1)),
			...paginationInput,
			//* bricks are read with documents_get, in the shape the write tools accept
			include: z
				.array(z.enum(["refs", "refs.documents", "refs.media", "refs.users"]))
				.optional(),
		})
		.prefault({})
		.transform(({ filter, filterOr, ...query }) => ({
			...query,
			...toQueryFilters(filter, filterOr),
		}))
		.meta({
			description:
				"All query fields are optional. Use {} to list documents. filter is a list of conditions combined with AND: include only the conditions you need. Prefix custom field keys with _, eg. {filter:[{key:'_fullSlug',value:'/blog/',operator:'starts-with'}]}. Brick fields use dotted keys, eg. {key:'hero._heading',value:'Spring',operator:'contains'}, repeaters add their key, eg. hero.links._label, top-level repeaters start with fields, eg. fields.links._label, and relation fields name the target collection, eg. {key:'_author.people._name',value:'Will'}. Also id, createdBy, updatedBy, createdAt and updatedAt. filterOr takes groups of conditions where any group can match. Sort, refs includes and pagination (perPage max 50).",
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
			refs: documentRefsSchema
				.optional()
				.meta({ description: "Scoped references requested by query.include." }),
		})
		.meta({ description: "Query context and optional scoped references." }),
});
