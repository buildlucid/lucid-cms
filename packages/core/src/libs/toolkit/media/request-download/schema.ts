import z from "zod";

export const inputSchema = z.object({
	id: z.number().int().positive(),
});
