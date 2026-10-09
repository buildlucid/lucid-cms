import z from "zod";

export const requestIdInput = z.number().int().positive().meta({
	description: "Request ID, eg. from requests_find or a chat reference.",
});

export const htmlInput = z.string().trim().min(1).max(10000);

export const requestUserSchema = z
	.object({ id: z.number(), name: z.string() })
	.meta({
		description:
			'A person. Mention them in HTML with <span data-lucid-mention data-lucid-user-id="ID"></span>.',
	});

export const requestLinksSchema = z
	.object({ request: z.string() })
	.meta({ description: "Admin link to share with the person." });
