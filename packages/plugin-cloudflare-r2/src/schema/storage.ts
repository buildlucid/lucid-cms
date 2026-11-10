import { z } from "@lucidcms/core";
import type { RouteSchema } from "@lucidcms/core/types";

export const controllerSchemas = {
	storageUpload: {
		body: undefined,
		query: z.object({
			token: z.string().meta({
				description: "The signed upload token.",
				example:
					"a64825f15c2acd40f8865933a26b7334d2c3dec3aba483cfab17396da0be8abe",
			}),
			timestamp: z.string().meta({
				description: "The signed upload timestamp.",
				example: "1745601807970",
			}),
			key: z.string().trim().meta({
				description: "The media key.",
				example: "public/123e4567e89b12d3a456426614174000",
			}),
			extension: z.string().trim().optional().meta({
				description: "The file extension.",
				example: "png",
			}),
		}),
		params: undefined,
		response: undefined,
	} satisfies RouteSchema,
	storageDownload: {
		body: undefined,
		query: z.object({
			token: z.string().meta({
				description: "The signed download token.",
				example:
					"a64825f15c2acd40f8865933a26b7334d2c3dec3aba483cfab17396da0be8abe",
			}),
			timestamp: z.string().meta({
				description: "The signed download timestamp.",
				example: "1745601807970",
			}),
			key: z.string().trim().meta({
				description: "The media key.",
				example: "public/123e4567e89b12d3a456426614174000",
			}),
			fileName: z.string().trim().optional().meta({
				description: "The original file name to use for downloads.",
				example: "placeholder-image.png",
			}),
			extension: z.string().trim().optional().meta({
				description: "The file extension to use for download fallbacks.",
				example: "png",
			}),
		}),
		params: undefined,
		response: undefined,
	} satisfies RouteSchema,
};
