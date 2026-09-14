import z from "zod";

export const inputSchema = z.object({
	collectionKey: z.string().min(1),
	ids: z.array(z.number().int().positive()),
	change: z
		.discriminatedUnion("type", [
			z.object({ type: z.literal("created") }),
			z.object({ type: z.literal("deleted"), permanent: z.boolean() }),
			z.object({ type: z.literal("restored") }),
			z.object({
				type: z.literal("updated"),
				version: z.string().min(1).optional(),
			}),
			z.object({ type: z.literal("published"), version: z.string().min(1) }),
			z.object({
				type: z.literal("referencesUpdated"),
				version: z.string().min(1),
			}),
		])
		.optional(),
});
