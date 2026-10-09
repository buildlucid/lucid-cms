import z from "zod";
import { requestWriteSchema } from "../schema.js";

export const inputSchema = requestWriteSchema.extend({
	/** When to complete the request once approved, as an ISO date. Null removes the schedule. */
	at: z.iso.datetime().nullable(),
	/** The timezone the time was chosen in, eg. "Europe/London". */
	timezone: z.string().trim().min(1).optional(),
});
