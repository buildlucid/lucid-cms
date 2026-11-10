import { z } from "@lucidcms/core";
import type { RouteSchema } from "@lucidcms/core/types";

const documentIdSchema = z.coerce.number().int().positive().meta({
	description: "The page's document ID",
	example: 1,
});

export const previousPathSchema = z.object({
	id: z.number(),
	environment: z.string().meta({
		description:
			"The environment the path was published to, or latest for collections without environments",
		example: "production",
	}),
	locale: z.string().nullable().meta({
		description: "The path's locale, or null for unlocalized paths",
		example: "en",
	}),
	path: z.string().meta({
		description: "The old path, which redirects to the page",
		example: "/about-us",
	}),
});

/** One of a page's old paths, as the previous paths route returns it. */
export type PreviousPath = z.infer<typeof previousPathSchema>;

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: z.object({
			environment: z.string().trim().min(1).optional().meta({
				description:
					"Only paths published to this environment. Leave out for every environment",
				example: "production",
			}),
		}),
		params: z.object({ documentId: documentIdSchema }),
		response: z.array(previousPathSchema),
	} satisfies RouteSchema,
	deleteSingle: {
		body: undefined,
		query: undefined,
		params: z.object({
			documentId: documentIdSchema,
			id: z.coerce.number().int().positive().meta({
				description: "The old path's ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies RouteSchema,
};
