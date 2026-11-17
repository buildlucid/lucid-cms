import z from "zod";

export const inputSchema = z.object({
	action: z.string().trim().min(1),
	field: z.string().trim().min(1),
});
