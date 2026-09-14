import z from "zod";

export const inputSchema = z.object({
	ids: z.array(z.number().int().positive()),
	change: z
		.discriminatedUnion("type", [
			z.object({ type: z.literal("created") }),
			z.object({ type: z.literal("deleted"), permanent: z.boolean() }),
			z.object({ type: z.literal("restored") }),
			z.object({ type: z.literal("updated") }),
		])
		.optional(),
});
