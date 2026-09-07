import z from "zod";

export const paginationSchema = z.object({
	/** One-based page number. Defaults to 1. */
	page: z.number().int().positive().default(1),
	/** Maximum items per page. Use -1 for all matches. Defaults to 10. */
	perPage: z.union([z.literal(-1), z.number().int().positive()]).default(10),
});
