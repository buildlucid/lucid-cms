import z from "zod";
import { htmlInput, requestIdInput, requestLinksSchema } from "../schema.js";

export const bodyInput = htmlInput.meta({
	description:
		'HTML. Mention people with <span data-lucid-mention data-lucid-user-id="ID"></span>, using IDs from users_find.',
});

export const inputSchema = z.object({
	requestId: requestIdInput,
	body: bodyInput,
});

export const outputSchema = z.object({
	comment: z
		.object({ id: z.number() })
		.meta({ description: "Pass its ID to requests_update_comment." }),
	links: requestLinksSchema,
});
