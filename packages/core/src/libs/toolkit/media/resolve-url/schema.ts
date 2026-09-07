import z from "zod";

export const inputSchema = z.object({
	key: z.string().trim().min(1),
	preset: z.string().trim().min(1).optional(),
	format: z.enum(["jpeg", "png", "webp", "avif"]).optional(),
});
