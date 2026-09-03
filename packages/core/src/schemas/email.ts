import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

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

export const emailTypeSchema = z.union([
	z.literal("external"),
	z.literal("internal"),
]);

export const emailPrioritySchema = z.union([
	z.literal("low"),
	z.literal("normal"),
	z.literal("high"),
]);

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
		priority: emailPrioritySchema.meta({
			description: "The priority hint supplied to the email adapter",
			example: "high",
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
	attachments: z.array(
		z.object({
			type: z.literal("url").meta({
				description: "The attachment source type",
				example: "url",
			}),
			url: z.url().meta({
				description: "The HTTP/S URL used as the attachment source",
				example: "https://example.com/invoice.pdf",
			}),
			filename: z.string().meta({
				description: "The filename shown for the attachment",
				example: "invoice.pdf",
			}),
			contentType: z.string().nullable().meta({
				description: "The MIME type of the attachment, if supplied",
				example: "application/pdf",
			}),
			disposition: z
				.union([z.literal("attachment"), z.literal("inline")])
				.meta({
					description:
						"Whether the attachment is displayed inline or as an attachment",
					example: "attachment",
				}),
			contentId: z.string().nullable().meta({
				description: "The optional CID used for inline attachments",
				example: "invoice-logo",
			}),
		}),
	),
	type: emailTypeSchema.meta({
		description:
			"Whether the email was triggered internally from Lucid, or externally via an endpoint",
		example: "internal",
	}),
	currentStatus: emailDeliveryStatusSchema.meta({
		description: "The current delivery status of the email",
		example: "sent",
	}),
	attemptCount: z.number().meta({
		description: "The number of attempts to send the email",
		example: 1,
	}),
	html: z.string().nullable().meta({
		description: "The rendered HTML content of the email template",
	}),
	resend: z.object({
		enabled: z.boolean().meta({
			description: "Whether this email can currently be resent",
			example: true,
		}),
		reason: z.enum(["outsideResendWindow", "unstoredData"]).optional().meta({
			description: "Why resend is disabled, if unavailable",
			example: "outsideResendWindow",
		}),
	}),
	lastAttemptedAt: z.string().nullable().meta({
		description: "The timestamp of the last attempt to send the email",
		example: "2024-04-25T14:30:00.000Z",
	}),
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
					"filter[fromAddress]": queryString.schema.filter(false, {
						example: "noreply@lucidcms.io",
					}),
					"filter[toAddress]": queryString.schema.filter(false, {
						example: "admin@lucidcms.io",
					}),
					"filter[subject]": queryString.schema.filter(false, {
						example: "Welcome To Lucid",
					}),
					"filter[currentStatus]": queryString.schema.filter(true, {
						example: "sent",
					}),
					"filter[type]": queryString.schema.filter(true, {
						example: "internal",
					}),
					"filter[template]": queryString.schema.filter(false, {
						example: "password-reset",
					}),
					"filter[priority]": queryString.schema.filter(true, {
						example: "high",
					}),
					"filter[attemptCount]": queryString.schema.filter(false, {
						example: "2",
					}),
					"filter[lastAttemptedAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					"filter[createdAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					"filter[updatedAt]": queryString.schema.filter(false, {
						example: "2026-01-01T00:00:00Z",
					}),
					sort: queryString.schema.sort(
						"lastAttemptedAt,attemptCount,createdAt,updatedAt",
					),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						fromAddress: queryFormatted.schema.filters.single.optional(),
						toAddress: queryFormatted.schema.filters.single.optional(),
						subject: queryFormatted.schema.filters.single.optional(),
						currentStatus: queryFormatted.schema.filters.union.optional(),
						type: queryFormatted.schema.filters.union.optional(), // internal | external
						template: queryFormatted.schema.filters.single.optional(),
						priority: queryFormatted.schema.filters.union.optional(),
						attemptCount: queryFormatted.schema.filters.single.optional(),
						lastAttemptedAt: queryFormatted.schema.filters.single.optional(),
						createdAt: queryFormatted.schema.filters.single.optional(),
						updatedAt: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
				sort: z
					.array(
						z.object({
							key: z.enum([
								"lastAttemptedAt",
								"attemptCount",
								"createdAt",
								"updatedAt",
							]),
							direction: z.enum(["asc", "desc"]),
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
			id: z.string().trim().meta({
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
			id: z.string().trim().meta({
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
			id: z.string().trim().meta({
				description: "The email ID",
				example: 1,
			}),
		}),
		response: z.object({
			jobId: z.string().meta({
				description: "The job ID",
				example: "1234567890",
			}),
		}),
	} satisfies ControllerSchema,
	getTransactions: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[deliveryStatus]": queryString.schema.filter(true),
					"filter[strategyIdentifier]": queryString.schema.filter(false),
					"filter[message]": queryString.schema.filter(false, {
						nullable: true,
					}),
					"filter[externalMessageId]": queryString.schema.filter(false, {
						nullable: true,
					}),
					"filter[simulate]": queryString.schema.filter(false),
					"filter[createdAt]": queryString.schema.filter(false),
					"filter[updatedAt]": queryString.schema.filter(false),
					sort: queryString.schema.sort("createdAt,updatedAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						deliveryStatus: queryFormatted.schema.filters.union.optional(),
						strategyIdentifier: queryFormatted.schema.filters.single.optional(),
						message: queryFormatted.schema.filters.single.optional(),
						externalMessageId: queryFormatted.schema.filters.single.optional(),
						simulate: queryFormatted.schema.filters.single.optional(),
						createdAt: queryFormatted.schema.filters.single.optional(),
						updatedAt: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt", "updatedAt"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: z.object({
			id: z.string().trim().meta({
				description: "The email ID",
				example: "1",
			}),
		}),
		response: z.array(
			z.object({
				id: z.number(),
				emailId: z.number(),
				deliveryStatus: emailDeliveryStatusSchema,
				message: z.string().nullable(),
				strategyIdentifier: z.string(),
				strategyData: z.record(z.string(), z.unknown()).nullable(),
				externalMessageId: z.string().nullable(),
				simulate: z.boolean(),
				createdAt: z.string().nullable(),
				updatedAt: z.string().nullable(),
			}),
		),
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;

export type GetTransactionsQueryParams = z.infer<
	typeof controllerSchemas.getTransactions.query.formatted
>;
