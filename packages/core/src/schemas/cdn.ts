import z from "zod";
import type { ControllerSchema } from "../types/schema.js";

export const controllerSchemas = {
	streamSingle: {
		body: undefined,
		query: {
			string: z.object({
				preset: z
					.string()
					.trim()
					.meta({
						description: "The preset to use for the image",
						example: "thumbnail-small",
					})
					.optional(),
				format: z
					.enum(["jpeg", "png", "webp", "avif"])
					.meta({
						description: "If requesting an image, the format to convert it to",
						example: "webp",
					})
					.optional(),
				fallback: z
					.enum(["true", "false"])
					.meta({
						description:
							"Determines if the fallback image should be returned when the requested one cannot be found",
						example: true,
					})
					.optional(),
			}),
			formatted: z.object({
				preset: z.string().trim().optional(),
				format: z.enum(["jpeg", "png", "webp", "avif"]).optional(),
				fallback: z.enum(["true", "false"]).optional(),
			}),
		},
		params: z.object({
			path: z.string().trim().meta({
				description:
					"The media's uid, optionally followed by a readable file name, as its URL gives it",
				example: "123e4567-e89b-12d3-a456-426614174000/placeholder-image.png",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};

export type StreamSingleQueryParams = z.infer<
	typeof controllerSchemas.streamSingle.query.formatted
>;
