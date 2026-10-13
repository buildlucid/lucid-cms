import z from "zod";

/** Data every request notification carries. */
export const requestData = z.object({
	requestId: z.number(),
	title: z.string(),
});
