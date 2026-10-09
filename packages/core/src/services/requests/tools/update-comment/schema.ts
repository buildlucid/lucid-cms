import z from "zod";
import { bodyInput } from "../comment/schema.js";
import { requestIdInput, requestLinksSchema } from "../schema.js";

export const inputSchema = z
	.object({
		requestId: requestIdInput,
		commentId: z.number().int().positive().meta({
			description: "A comment or reply you wrote, from requests_get.",
		}),
		action: z.enum(["resolve", "close", "reopen", "edit", "remove"]).meta({
			description:
				"resolve once a top-level comment is dealt with, close when no change is needed, reopen to open it again, edit to rewrite it with body, or remove to delete it and its replies.",
		}),
		body: bodyInput
			.optional()
			.meta({ description: "edit only. The new HTML." }),
	})
	.refine((input) => input.action !== "edit" || input.body !== undefined, {
		message: "Give the new body to edit a comment",
		path: ["body"],
	});

export const outputSchema = z.object({
	links: requestLinksSchema,
});
