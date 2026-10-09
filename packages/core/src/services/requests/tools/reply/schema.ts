import z from "zod";
import { bodyInput } from "../comment/schema.js";
import { requestIdInput } from "../schema.js";

export const inputSchema = z.object({
	requestId: requestIdInput,
	replyTo: z.number().int().positive().meta({
		description: "ID of the top-level comment to reply to, from requests_get.",
	}),
	body: bodyInput,
});
