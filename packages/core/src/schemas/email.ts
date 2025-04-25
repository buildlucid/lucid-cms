import z from "zod";
import defaultQuery, { filterSchemas } from "./default-query.js";
import queryString from "../utils/swagger/query-string.js";
import type { ControllerSchema } from "../types.js";

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
	deliveryStatus: z
		.union([z.literal("sent"), z.literal("failed"), z.literal("pending")])
		.meta({
			description: "The current delivery status of the email",
			example: "sent",
		}),
	type: z.union([z.literal("external"), z.literal("internal")]).meta({
		description:
			"Whether the email was triggered internally from Lucid, or externally via an endpoint",
		example: "internal",
	}),
	emailHash: z.string().meta({
		description: "A unique hash identifier for the email",
		example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
	}),
	sentCount: z.number().meta({
		description:
			"Number of times the system has attempted to send this email successfully",
		example: 1,
	}),
	errorCount: z.number().meta({
		description: "Number of failed delivery attempts",
		example: 0,
	}),
	html: z.string().nullable().meta({
		description: "The rendered HTML content of the email template",
	}),
	errorMessage: z.string().nullable().meta({
		description: "The most recent error message if email delivery failed",
		example: "SMTP connection timed out",
	}),
	createdAt: z.string().nullable().meta({
		description: "Timestamp when the email was created",
		example: "2024-04-25T14:30:00.000Z",
	}),
	lastSuccessAt: z.string().nullable().meta({
		description: "Timestamp when the email was last successfully sent",
		example: "2024-04-25T14:31:10.000Z",
	}),
	lastAttemptAt: z.string().nullable().meta({
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
						toAddress: filterSchemas.single.optional(),
						subject: filterSchemas.single.optional(),
						deliveryStatus: filterSchemas.union.optional(),
						type: filterSchemas.union.optional(), // internal | external
						template: filterSchemas.single.optional(),
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
				page: defaultQuery.page,
				perPage: defaultQuery.perPage,
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
