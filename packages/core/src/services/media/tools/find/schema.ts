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
import { mediaStatusSchema } from "../../../../schemas/media.js";
import type { MediaType } from "../../../../types/response.js";

const mediaTypes = [
	"image",
	"video",
	"audio",
	"document",
	"archive",
	"unknown",
] as const satisfies readonly MediaType[];

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
		.array(
			z.object({
				id: z.number().meta({ description: "Media ID for media_preview." }),
				type: z.enum(mediaTypes).meta({ description: "Media kind." }),
				status: mediaStatusSchema.meta({
					description: "Media processing status.",
				}),
				title: z
					.string()
					.nullable()
					.meta({ description: "Localized media title." }),
				alt: z
					.string()
					.nullable()
					.meta({ description: "Localized image or poster alt text." }),
				description: z.string().nullable().meta({
					description: "Localized video/audio description or document summary.",
				}),
				fileName: z
					.string()
					.nullable()
					.meta({ description: "Stored file name." }),
				mimeType: z.string().meta({ description: "Original MIME type." }),
				width: z
					.number()
					.nullable()
					.meta({ description: "Image or video width in pixels." }),
				height: z
					.number()
					.nullable()
					.meta({ description: "Image or video height in pixels." }),
				public: z
					.boolean()
					.meta({ description: "Whether public delivery is enabled." }),
				url: z.string().nullable().meta({
					description: "Public delivery URL; null for private media.",
				}),
			}),
		)
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
