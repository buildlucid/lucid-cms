import z from "zod/v4";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import type { ControllerSchema } from "../types.js";

export const emailDeliveryStatusSchema = z.union([
	z.literal("sent"),
	z.literal("delivered"),
	z.literal("delayed"),
	z.literal("complained"),
	z.literal("bounced"),
	z.literal("clicked"),
	z.literal("failed"),
	z.literal("opened"),
	z.literal("scheduled"),
]);
export type EmailDeliveryStatus = z.infer<typeof emailDeliveryStatusSchema>;

export const emailTypeSchema = z.union([
	z.literal("external"),
	z.literal("internal"),
]);
export type EmailType = z.infer<typeof emailTypeSchema>;

const emailResponseSchema = z.object({
	id: z.number().meta({
		description: "The email ID",
		example: 1,
	}),
	mailDetails: z.object({
		from: z.object({
			address: z.email().meta({
				description: "The sender's email address",
				example: "admin@lucidcms.io",
			}),
			name: z.string().meta({
				description: "The sender's name",
				example: "Admin",
			}),
		}),
		to: z.string().meta({
			description: "The recipient's email address",
			example: "user@example.com",
		}),
		subject: z.string().meta({
			description: "The email subject line",
			example: "Welcome to Lucid CMS",
		}),
		cc: z.string().nullable().meta({
			description: "Carbon copy recipients (comma-separated)",
			example: "manager@example.com,team@example.com",
		}),
		bcc: z.string().nullable().meta({
			description: "Blind carbon copy recipients (comma-separated)",
			example: "logs@example.com",
		}),
		template: z.string().meta({
			description:
				"The template identifier used for generating the email content",
			example: "welcome-email",
		}),
	}),
	data: z
		.record(z.any(), z.any())
		.nullable()
		.meta({
			description: "Custom data passed to the email template for rendering",
			example: {
				username: "JohnDoe",
				accountType: "premium",
				verificationUrl: "https://example.com/verify/token123",
			},
		}),
	type: emailTypeSchema.meta({
		description:
			"Whether the email was triggered internally from Lucid, or externally via an endpoint",
		example: "internal",
	}),
	html: z.string().nullable().meta({
		description: "The rendered HTML content of the email template",
	}),
	transactions: z.array(
		z.object({
			deliveryStatus: emailDeliveryStatusSchema.meta({
				description: "The current delivery status of the email",
				example: "sent",
			}),
			message: z.string().nullable().meta({
				description: "The message associated with the email delivery",
				example: "Email sent successfully",
			}),
			strategyIdentifier: z.string().meta({
				description: "The identifier of the strategy used to send the email",
				example: "smtp",
			}),
			strategyData: z
				.record(z.string(), z.any())
				.nullable()
				.meta({
					description: "The data associated with the email delivery",
					example: {
						username: "JohnDoe",
						accountType: "premium",
						verificationUrl: "https://example.com/verify/token123",
					},
				}),
			simulate: z.boolean().meta({
				description: "Whether the email was simulated and not actually sent",
				example: true,
			}),
			createdAt: z.string().nullable().meta({
				description: "Timestamp when the email was created",
				example: "2024-04-25T14:30:00.000Z",
			}),
		}),
	),
	createdAt: z.string().nullable().meta({
		description: "Timestamp when the email was created",
		example: "2024-04-25T14:30:00.000Z",
	}),
	updatedAt: z.string().nullable().meta({
		description: "Timestamp of the most recent delivery attempt",
		example: "2024-04-25T14:31:10.000Z",
	}),
});

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[toAddress]": queryString.schema.filter(
						false,
						"admin@lucidcms.io",
					),
					"filter[subject]": queryString.schema.filter(
						false,
						"Welcome To Lucid",
					),
					"filter[deliveryStatus]": queryString.schema.filter(true, "sent"),
					"filter[type]": queryString.schema.filter(true, "internal"),
					"filter[template]": queryString.schema.filter(
						false,
						"password-reset",
					),
					sort: queryString.schema.sort(
						"lastAttemptAt,lastSuccessAt,createdAt,sentCount,errorCount",
					),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						toAddress: queryFormatted.schema.filters.single.optional(),
						subject: queryFormatted.schema.filters.single.optional(),
						deliveryStatus: queryFormatted.schema.filters.union.optional(),
						type: queryFormatted.schema.filters.union.optional(), // internal | external
						template: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum([
								"lastAttemptAt",
								"lastSuccessAt",
								"createdAt",
								"sentCount",
								"errorCount",
							]),
							value: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		response: z.array(emailResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The email ID",
				example: 1,
			}),
		}),
		response: emailResponseSchema,
	} satisfies ControllerSchema,
	deleteSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The email ID",
				example: 1,
			}),
		}),
		response: undefined,
	} satisfies ControllerSchema,
	resendSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The email ID",
				example: 1,
			}),
		}),
		response: z.object({
			success: z.boolean().meta({
				description: "Whether the email was sent successfully",
				example: true,
			}),
			message: z.string().meta({
				description: "The response message",
				example: "Email sent successfully",
			}),
		}),
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
