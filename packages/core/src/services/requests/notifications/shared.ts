import z from "zod";

/** Data every request notification carries. */
export const requestData = z.object({
	requestId: z.number(),
	title: z.string(),
});

/** Links a request notification to its request. */
export const requestHref = (requestId: number) =>
	`/lucid/requests/${requestId}`;
