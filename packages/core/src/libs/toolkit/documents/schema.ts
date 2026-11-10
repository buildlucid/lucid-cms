import z from "zod";

/** Strict, so a misplaced option such as a filter nested under `query` is refused rather than ignored. */
export const documentInputSchema = z.strictObject({
	collectionKey: z.string().min(1),
	version: z.string().min(1),
	preview: z.string().min(1).nullable().optional(),
});
