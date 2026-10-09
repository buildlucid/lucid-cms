import z from "zod";
import { querySchema } from "../../../../libs/toolkit/media/get-multiple/schema.js";
import {
	filterConditionsInput,
	toQueryFilters,
} from "../../../../libs/tools/filter-conditions.js";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { mediaItemSchema } from "../helpers/schema.js";

export const inputSchema = z.object({
	query: querySchema
		.omit({ filter: true })
		.extend({
			filter: filterConditionsInput(querySchema.shape.filter.unwrap().keyof()),
			perPage: paginationInput.perPage,
		})
		.prefault({})
		.transform(
			({ filter, filterOr, ...query }): z.input<typeof querySchema> => ({
				...query,
				...toQueryFilters(filter, filterOr),
			}),
		)
		.pipe(querySchema)
		.meta({
			description:
				"All query fields are optional. filter is a list of conditions combined with AND. Include only conditions needed for the search. For images use {filter:[{key:'type',value:'image',operator:'='}]}. For a title search use {filter:[{key:'title',value:'logo',operator:'contains'}]}. Use {} to browse without filters. perPage max 50.",
		}),
	contentLocale: z.string().trim().min(1).optional().meta({
		description:
			"Content language for title, alt text and descriptions; defaults to the CMS content language.",
	}),
});

export const outputSchema = z.object({
	data: z
		.array(mediaItemSchema)
		.meta({ description: "Matching media records for this page." }),
	pagination: paginationSchema,
	meta: z
		.object({
			contentLocale: z
				.string()
				.nullable()
				.meta({ description: "Selected content language." }),
		})
		.meta({ description: "Media query context." }),
});
