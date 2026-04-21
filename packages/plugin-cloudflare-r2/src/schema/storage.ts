import { z } from "@lucidcms/core";
import type { ControllerSchema } from "@lucidcms/core/types";

export const controllerSchemas = {
	storageUpload: {
		body: undefined,
		query: {
			string: z.object({
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
					example: "public/5ttogd-placeholder-image.png",
				}),
				extension: z.string().trim().optional().meta({
					description: "The file extension.",
					example: "png",
				}),
			}),
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	storageDownload: {
		body: undefined,
		query: {
			string: z.object({
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
					example: "public/5ttogd-placeholder-image.png",
				}),
			}),
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};
