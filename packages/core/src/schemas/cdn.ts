import z from "zod";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	streamSingle: {
		body: undefined,
		query: {
			string: z.object({
				width: z
					.string()
					.meta({
						description: "If requesting an image, the width to resize it to",
						example: "600",
					})
					.optional(),
				height: z
					.string()
					.meta({
						description: "If requesting an image, the height to resize it to",
						example: "600",
					})
					.optional(),
				format: z
					.enum(["jpeg", "png", "webp", "avif"])
					.meta({
						description: "If requesting an image, the format to convert it to",
						example: "avif",
					})
					.optional(),
				quality: z
					.string()
					.meta({
						description:
							"If requesting an image, the quality that it should be optimised to",
						example: "80",
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
				width: z
					.string()
					.refine((val) => Number(val) > 0, {
						message: "Width must be greater than 0",
					})
					.refine((val) => Number(val) <= 2000, {
						message: "Width must be less than or equal to 2000",
					})
					.optional(),
				height: z
					.string()
					.refine((val) => Number(val) > 0, {
						message: "Height must be greater than 0",
					})
					.refine((val) => Number(val) <= 2000, {
						message: "Height must be less than or equal to 2000",
					})
					.optional(),
				format: z.enum(["jpeg", "png", "webp", "avif"]).optional(),
				quality: z
					.string()
					.refine((val) => Number(val) > 0, {
						message: "Quality must be greater than 0",
					})
					.refine((val) => Number(val) <= 100, {
						message: "Quality must be less than or equal to 100",
					})
					.optional(),
				fallback: z.enum(["true", "false"]).optional(),
			}),
		},
		params: z.object({
			"*": z.string().meta({
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
