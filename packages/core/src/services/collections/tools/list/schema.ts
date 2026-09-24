import z from "zod";
import {
	paginationInput,
	paginationSchema,
} from "../../../../libs/tools/pagination.js";
import { collectionLocalizationSchema } from "../schema.js";

export const inputSchema = z.object(paginationInput);

export const outputSchema = z.object({
	data: z
		.array(
			z.object({
				key: z
					.string()
					.meta({ description: "Collection key for document tools." }),
				mode: z
					.enum(["single", "multiple"])
					.meta({ description: "Document count mode." }),
				label: z.string().meta({
					description: "Collection name in the current interface language.",
				}),
				description: z
					.string()
					.nullable()
					.meta({ description: "Collection summary." }),
				routing: z.object({ field: z.string() }).nullable().meta({
					description: "Field containing the complete public URL path.",
				}),
				labelFields: z
					.array(z.string())
					.meta({ description: "Fields used to identify documents in lists." }),
				localization: collectionLocalizationSchema,
				publishingTargetCount: z
					.number()
					.meta({ description: "Number of configured publishing targets." }),
			}),
		)
		.meta({ description: "Readable collection summaries for this page." }),
	pagination: paginationSchema,
});
