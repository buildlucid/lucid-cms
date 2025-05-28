import z from "zod";
import type { ControllerSchema } from "../types.js";

export const controllerSchemas = {
	streamSingle: {
		body: undefined,
		query: {
			string: z.object({
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
