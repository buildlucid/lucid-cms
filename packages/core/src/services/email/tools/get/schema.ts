import z from "zod";
import { controllerSchemas } from "../../../../schemas/email.js";
import { emailIdInput, emailSummarySchema } from "../schema.js";

export const inputSchema = z.object({
	emailId: emailIdInput,
	includeHtml: z.boolean().default(false).meta({
		description:
			"Render the email's HTML from its template and stored data. Off by default, as it runs long.",
	}),
});

export const outputSchema = z.object({
	data: emailSummarySchema.extend({
		data: z.record(z.string(), z.unknown()).nullable().meta({
			description: "Template data as stored, with protected values redacted.",
		}),
		attachments: z.array(
			z.object({ filename: z.string(), contentType: z.string().nullable() }),
		),
		resendable: z.boolean().meta({
			description: "Whether emails_resend can send it again.",
		}),
		html: z.string().nullable().meta({
			description: "Rendered HTML when includeHtml is true.",
		}),
		htmlTruncated: z.boolean(),
		deliveries: z
			.array(
				controllerSchemas.getTransactions.response.element.omit({
					emailId: true,
					strategyData: true,
				}),
			)
			.meta({ description: "Latest delivery attempts, newest first." }),
	}),
});
