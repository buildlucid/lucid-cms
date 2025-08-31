import { z } from "@lucidcms/core";
import type { ControllerSchema } from "@lucidcms/core/types";

export const controllerSchemas = {
	webhook: {
		body: z.object({
			type: z.string().meta({
				description: "The type of the event",
				example: "email.delivery_delayed",
			}),
			created_at: z.string().meta({
				description: "The timestamp of the event",
				example: "2024-02-22T23:41:12.126Z",
			}),
			data: z.object({
				broadcast_id: z.string().optional().meta({
					description: "The broadcast ID",
					example: "8b146471-e88e-4322-86af-016cd36fd216",
				}),
				created_at: z.string().meta({
					description: "The timestamp of the event",
					example: "2024-02-22T23:41:11.894719+00:00",
				}),
				email_id: z.string().meta({
					description: "The email ID",
					example: "56761188-7520-42d8-8898-ff6fc54ce618",
				}),
				from: z.string().meta({
					description: "The sender's email address",
					example: "Acme <onboarding@resend.dev>",
				}),
				to: z.array(z.string()).meta({
					description: "The recipient's email address",
					example: ["delivered@resend.dev"],
				}),
				subject: z.string().meta({
					description: "The email subject",
					example: "Sending this example",
				}),
				tags: z
					.record(z.string(), z.any())
					.optional()
					.meta({
						description: "Email tags",
						example: { category: "confirm_email" },
					}),
				bounce: z
					.object({
						message: z.string(),
						subType: z.string(),
						type: z.string(),
					})
					.optional(),
				click: z
					.object({
						ipAddress: z.string(),
						link: z.string(),
						timestamp: z.string(),
						userAgent: z.string(),
					})
					.optional(),
				failed: z
					.object({
						reason: z.string(),
					})
					.optional(),
			}),
		}),
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: undefined,
		response: undefined,
	} satisfies ControllerSchema,
};

export type WebhookBody = z.infer<typeof controllerSchemas.webhook.body>;
