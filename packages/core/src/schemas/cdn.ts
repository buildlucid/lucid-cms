import z from "zod";

export default {
	streamSingle: {
		body: undefined,
		query: z.object({
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
		params: z.object({
			"*": z.string(),
		}),
	},
};
