import z from "zod/v4";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	streamSingle: {
		body: undefined,
		query: {
			string: z.object({
				preset: z
					.string()
					.meta({
						description: "The preset to use for the image",
						example: "thumbnail",
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
				preset: z.string().optional(),
				format: z.enum(["jpeg", "png", "webp", "avif"]).optional(),
				fallback: z.enum(["true", "false"]).optional(),
			}),
		},
		params: z.object({
			key: z.string().meta({
				description: "The media key you wish to stream",
				example: "2024/09/5ttogd-placeholder-image.png",
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
};

export type StreamSingleQueryParams = z.infer<
	typeof controllerSchemas.streamSingle.query.formatted
>;
