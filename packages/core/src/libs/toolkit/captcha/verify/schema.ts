import z from "zod";

export const inputSchema = z.object({
	token: z.string().nullish(),
	action: z.string().trim().min(1),
});
