import z from "zod";
import { controllerSchemas } from "../../../schemas/email.js";

export const emailIdInput = z.number().int().positive().meta({
	description: "Email ID, eg. from emails_find.",
});

/** An email as listings show it: who it went to and how delivery went, without its template data, attachments or HTML. */
export const emailSummarySchema = controllerSchemas.getSingle.response
	.omit({ data: true, attachments: true, html: true, resend: true })
	.extend({
		updatedAt: z.string().nullable().optional().meta({
			description: "When delivery was last attempted or its status changed.",
		}),
	});
