import z from "zod";
import { requestIdInput, requestLinksSchema } from "../schema.js";

export const inputSchema = z.object({
	requestId: requestIdInput,
	at: z.iso.datetime().nullable().meta({
		description:
			"When to complete the request once approved, as an ISO date. Null removes the schedule.",
	}),
	timezone: z.string().trim().min(1).optional().meta({
		description:
			'The timezone the time was chosen in, eg. "Europe/London". Defaults to UTC.',
	}),
});

export const outputSchema = z.object({
	scheduledAt: z.string().nullable(),
	links: requestLinksSchema,
});
