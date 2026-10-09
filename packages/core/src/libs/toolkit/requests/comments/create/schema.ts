import z from "zod";
import { requestBodySchema, requestWriteSchema } from "../../schema.js";

export const inputSchema = requestWriteSchema.extend({
	body: requestBodySchema,
	/** A top-level comment to reply to. Replies leave the request as it is. */
	replyTo: z.number().int().positive().optional(),
});
