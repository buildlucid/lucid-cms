import z from "zod";
import { bodyInput } from "../comment/schema.js";
import { requestIdInput, requestLinksSchema } from "../schema.js";

/** Only edit actions accept a body. */
export const actionSchema = z
	.discriminatedUnion("type", [
		z.object({
			type: z.literal("edit"),
			body: bodyInput.meta({ description: "The new HTML." }),
		}),
		z
			.object({ type: z.enum(["resolve", "close", "reopen", "remove"]) })
			.strict(),
	])
	.meta({
		description:
			"resolve once a top-level comment is dealt with, close when no change is needed, reopen to open it again, edit to rewrite it with body, or remove to delete it and its replies. Eg. {type:'resolve'} or {type:'edit',body:'<p>Updated</p>'}.",
	});

export const inputSchema = z.object({
	requestId: requestIdInput,
	commentId: z.number().int().positive().meta({
		description: "A comment or reply you wrote, from requests_get.",
	}),
	action: actionSchema,
});

export const outputSchema = z.object({
	links: requestLinksSchema,
});
