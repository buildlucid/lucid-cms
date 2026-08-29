import z from "zod";
import {
	jobDispatchStatusSchema,
	jobPayloadSchema,
	jobStatusSchema,
} from "../libs/queue/schema.js";
import type { ControllerSchema } from "../types.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

export const controllerSchemas = {
	getMultiple: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[jobId]": queryString.schema.filter(false),
					"filter[jobName]": queryString.schema.filter(false),
					"filter[jobVersion]": queryString.schema.filter(false),
					"filter[status]": queryString.schema.filter(true),
					"filter[queueAdapterKey]": queryString.schema.filter(false),
					"filter[attempts]": queryString.schema.filter(false),
					"filter[maxAttempts]": queryString.schema.filter(false),
					"filter[dispatchStatus]": queryString.schema.filter(true),
					"filter[dispatchAttempts]": queryString.schema.filter(false),
					"filter[dispatchError]": queryString.schema.filter(false),
					"filter[errorMessage]": queryString.schema.filter(false),
					"filter[createdByUserId]": queryString.schema.filter(false),
					"filter[createdAt]": queryString.schema.filter(false),
					"filter[availableAt]": queryString.schema.filter(false),
					"filter[startedAt]": queryString.schema.filter(false),
					"filter[completedAt]": queryString.schema.filter(false),
					"filter[failedAt]": queryString.schema.filter(false),
					"filter[cancelledAt]": queryString.schema.filter(false),
					"filter[dispatchedAt]": queryString.schema.filter(false),
					"filter[leaseExpiresAt]": queryString.schema.filter(false),
					sort: queryString.schema.sort(
						"createdAt,availableAt,startedAt,completedAt,failedAt,cancelledAt,dispatchedAt,leaseExpiresAt,attempts,dispatchAttempts",
					),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						jobId: queryFormatted.schema.filters.single.optional(),
						jobName: queryFormatted.schema.filters.single.optional(),
						jobVersion: queryFormatted.schema.filters.single.optional(),
						status: queryFormatted.schema.filters.union.optional(),
						queueAdapterKey: queryFormatted.schema.filters.single.optional(),
						attempts: queryFormatted.schema.filters.single.optional(),
						maxAttempts: queryFormatted.schema.filters.single.optional(),
						dispatchStatus: queryFormatted.schema.filters.union.optional(),
						dispatchAttempts: queryFormatted.schema.filters.single.optional(),
						dispatchError: queryFormatted.schema.filters.single.optional(),
						errorMessage: queryFormatted.schema.filters.single.optional(),
						createdByUserId: queryFormatted.schema.filters.single.optional(),
						createdAt: queryFormatted.schema.filters.single.optional(),
						availableAt: queryFormatted.schema.filters.single.optional(),
						startedAt: queryFormatted.schema.filters.single.optional(),
						completedAt: queryFormatted.schema.filters.single.optional(),
						failedAt: queryFormatted.schema.filters.single.optional(),
						cancelledAt: queryFormatted.schema.filters.single.optional(),
						dispatchedAt: queryFormatted.schema.filters.single.optional(),
						leaseExpiresAt: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
				sort: z
					.array(
						z.object({
							key: z.enum([
								"createdAt",
								"availableAt",
								"startedAt",
								"completedAt",
								"failedAt",
								"cancelledAt",
								"dispatchedAt",
								"leaseExpiresAt",
								"attempts",
								"dispatchAttempts",
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
		response: z.array(
			z.object({
				id: z.number(),
				jobId: z.string(),
				jobName: z.string(),
				jobVersion: z.number(),
				displayData: jobPayloadSchema.nullable(),
				queueAdapterKey: z.string(),
				status: jobStatusSchema,
				attempts: z.number(),
				maxAttempts: z.number(),
				dispatchStatus: jobDispatchStatusSchema,
				dispatchAttempts: z.number(),
				dispatchError: z.string().nullable(),
				errorMessage: z.string().nullable(),
				createdAt: z.string().nullable(),
				availableAt: z.string().nullable(),
				startedAt: z.string().nullable(),
				completedAt: z.string().nullable(),
				failedAt: z.string().nullable(),
				cancelledAt: z.string().nullable(),
				dispatchedAt: z.string().nullable(),
				leaseExpiresAt: z.string().nullable(),
				createdByUserId: z.number().nullable(),
				updatedAt: z.string().nullable(),
			}),
		),
	} satisfies ControllerSchema,
	getSingle: {
		body: undefined,
		query: { string: undefined, formatted: undefined },
		params: z.object({ id: z.string().trim() }),
		response: z.object({
			id: z.number(),
			jobId: z.string(),
			jobName: z.string(),
			jobVersion: z.number(),
			displayData: jobPayloadSchema.nullable(),
			queueAdapterKey: z.string(),
			status: jobStatusSchema,
			attempts: z.number(),
			maxAttempts: z.number(),
			dispatchStatus: jobDispatchStatusSchema,
			dispatchAttempts: z.number(),
			dispatchError: z.string().nullable(),
			errorMessage: z.string().nullable(),
			createdAt: z.string().nullable(),
			availableAt: z.string().nullable(),
			startedAt: z.string().nullable(),
			completedAt: z.string().nullable(),
			failedAt: z.string().nullable(),
			cancelledAt: z.string().nullable(),
			dispatchedAt: z.string().nullable(),
			leaseExpiresAt: z.string().nullable(),
			createdByUserId: z.number().nullable(),
			updatedAt: z.string().nullable(),
		}),
	} satisfies ControllerSchema,
};

export type GetMultipleQueryParams = z.infer<
	typeof controllerSchemas.getMultiple.query.formatted
>;
