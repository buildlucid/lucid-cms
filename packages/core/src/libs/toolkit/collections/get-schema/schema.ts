import z from "zod";

export const inputSchema = z.strictObject({
	/** Key of the registered collection whose database schema you need. */
	collectionKey: z.string().min(1),
});
