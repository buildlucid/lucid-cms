import z from "zod";

export const inputSchema = z.object({
	id: z.number().int().positive(),
	range: z
		.object({
			start: z.number().int().nonnegative(),
			end: z.number().int().nonnegative().optional(),
		})
		.refine((range) => range.end === undefined || range.end >= range.start, {
			message: "Range end must be greater than or equal to its start.",
			path: ["end"],
		})
		.optional(),
});
