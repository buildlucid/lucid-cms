import z from "zod";

/** A webpage found or read by a web tool. */
export const webSourceSchema = z.object({
	url: z.string(),
	title: z.string(),
	/** `YYYY-MM-DD`, when the source reports one. */
	publishedAt: z.string().nullable(),
});
