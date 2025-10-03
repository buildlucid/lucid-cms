import z from "zod/v4";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import type { ControllerSchema } from "../types.js";

export const queueJobStatusSchema = z.union([
	z.literal("pending"),
	z.literal("processing"),
	z.literal("completed"),
	z.literal("failed"),
]);

const jobResponseSchema = z.object({
	id: z.number().meta({
		description: "The job ID",
		example: 1,
	}),
	jobId: z.string().meta({
		description: "The unique job identifier",
		example: "job_abc123",
	}),
	eventType: z.string().meta({
		description: "The type of event this job handles",
		example: "email:send",
	}),
	eventData: z.record(z.string(), z.any()).meta({
		description: "The data associated with the job event",
		example: {
			emailId: 123,
			recipientEmail: "user@example.com",
		},
	}),
	queueAdapterKey: z.string().meta({
		description: "The queue adapter key used to process this job",
		example: "passthrough",
	}),
	status: queueJobStatusSchema.meta({
		description: "The current status of the job",
		example: "completed",
	}),
	priority: z.number().nullable().meta({
		description: "The priority level of the job (higher = more priority)",
		example: 10,
	}),
	attempts: z.number().meta({
		description: "The number of attempts made to process this job",
		example: 1,
	}),
	maxAttempts: z.number().meta({
		description: "The maximum number of attempts allowed for this job",
		example: 3,
	}),
	errorMessage: z.string().nullable().meta({
		description: "The error message if the job failed",
		example: "Connection timeout",
	}),
	createdAt: z.string().nullable().meta({
		description: "Timestamp when the job was created",
		example: "2024-04-25T14:30:00.000Z",
	}),
	scheduledFor: z.string().nullable().meta({
		description: "Timestamp when the job is scheduled to run",
		example: "2024-04-25T14:30:00.000Z",
	}),
	startedAt: z.string().nullable().meta({
		description: "Timestamp when the job started processing",
		example: "2024-04-25T14:30:05.000Z",
	}),
	completedAt: z.string().nullable().meta({
		description: "Timestamp when the job completed successfully",
		example: "2024-04-25T14:30:10.000Z",
	}),
	failedAt: z.string().nullable().meta({
		description: "Timestamp when the job failed",
		example: "2024-04-25T14:30:08.000Z",
	}),
	nextRetryAt: z.string().nullable().meta({
		description: "Timestamp when the job will be retried next",
		example: "2024-04-25T14:35:00.000Z",
	}),
	createdByUserId: z.number().nullable().meta({
		description: "The ID of the user who created the job",
		example: 1,
	}),
	updatedAt: z.string().nullable().meta({
		description: "Timestamp when the job was last updated",
		example: "2024-04-25T14:30:10.000Z",
	}),
});

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[jobId]": queryString.schema.filter(false, {
						example: "9d1fcfac-f491-43d4-a33b-4432b91a373c",
					}),
					"filter[eventType]": queryString.schema.filter(false, {
						example: "email:send",
					}),
					"filter[status]": queryString.schema.filter(true, {
						example: "completed",
					}),
					"filter[queueAdapterKey]": queryString.schema.filter(false, {
						example: "passthrough",
					}),
					sort: queryString.schema.sort(
						"createdAt,scheduledFor,startedAt,completedAt,failedAt,priority,attempts",
					),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						jobId: queryFormatted.schema.filters.single.optional(),
						eventType: queryFormatted.schema.filters.single.optional(),
						status: queryFormatted.schema.filters.union.optional(),
						queueAdapterKey: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum([
								"createdAt",
								"scheduledFor",
								"startedAt",
								"completedAt",
								"failedAt",
								"priority",
								"attempts",
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
		response: z.array(jobResponseSchema),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: {
			string: undefined,
			formatted: undefined,
		},
		params: z.object({
			id: z.string().meta({
				description: "The job ID",
				example: 1,
			}),
		}),
		response: jobResponseSchema,
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
