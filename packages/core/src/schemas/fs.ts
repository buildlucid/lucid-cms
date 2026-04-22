import z from "zod";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	upload: {
		body: undefined,
		query: {
			string: z.object({
				token: z.string().meta({
					description: "The presigned URL token",
					example:
						"a64825f15c2acd40f8865933a26b7334d2c3dec3aba483cfab17396da0be8abe",
				}),
				timestamp: z.string().meta({
					description: "Timestamp",
					example: "1745601807970",
				}),
				key: z.string().trim().meta({
					description: "The media key",
					example: "public/123e4567e89b12d3a456426614174000",
				}),
				mimeType: z.string().trim().meta({
					description: "The mime type for the uploaded file",
					example: "image/png",
				}),
				extension: z.string().trim().optional().meta({
					description: "The file extension for the uploaded file",
					example: "png",
				}),
			}),
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
	download: {
		body: undefined,
		query: {
			string: z.object({
				token: z.string().meta({
					description: "The presigned URL token",
					example:
						"a64825f15c2acd40f8865933a26b7334d2c3dec3aba483cfab17396da0be8abe",
				}),
				timestamp: z.string().meta({
					description: "Timestamp",
					example: "1745601807970",
				}),
				key: z.string().trim().meta({
					description: "The media key",
					example: "private/123e4567e89b12d3a456426614174000",
				}),
				fileName: z.string().trim().optional().meta({
					description: "The original file name to use for downloads",
					example: "placeholder-image.png",
				}),
				extension: z.string().trim().optional().meta({
					description: "The file extension to use for download fallbacks",
					example: "png",
				}),
			}),
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};
