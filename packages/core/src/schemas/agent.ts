import z from "zod";
import type { ControllerSchema } from "../exports/types.js";
import type {
	AgentApprovalAnswer,
	AgentDelivery,
	AgentInput,
	AgentInputAction,
	AgentRoutineSource,
} from "../types/response.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";

/** Pending and claimed input is still to be delivered; the rest is kept as a receipt. */
export const agentInputStatusSchema = z.enum([
	"pending",
	"claimed",
	"consumed",
	"cancelled",
]);

export const agentDeliverySchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("queue") }).strict(),
	z.object({ kind: z.literal("steer"), targetRunId: z.uuid() }).strict(),
]) satisfies z.ZodType<AgentDelivery>;

export const agentInputSchema = z.object({
	id: z.uuid(),
	text: z.string(),
	status: z.enum(["pending", "claimed"]),
	delivery: agentDeliverySchema,
}) satisfies z.ZodType<AgentInput>;

export const agentInputActionSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("cancel"), id: z.uuid() }),
	z.object({
		kind: z.literal("steer"),
		id: z.uuid(),
		targetRunId: z.uuid(),
	}),
	z.object({ kind: z.literal("resume") }),
	z.object({ kind: z.literal("clear") }),
]) satisfies z.ZodType<AgentInputAction>;

/** Code routines are synced from config; database routines are created by users. */
export const agentRoutineSourceSchema = z.enum([
	"code",
	"database",
]) satisfies z.ZodType<AgentRoutineSource>;

export const agentRunStatusSchema = z.enum([
	"queued",
	"running",
	"waiting",
	"interrupted",
	"completed",
	"failed",
	"cancelled",
]);
export const agentApprovalAnswerSchema = z.enum([
	"approve",
	"deny",
]) satisfies z.ZodType<AgentApprovalAnswer>;

export const agentRunOutcomeSchema = z.enum([
	"done",
	"nothing_to_report",
	"needs_review",
]);

export const agentMessagePartSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("text"), text: z.string() }).strict(),
	z
		.object({
			type: z.literal("tool"),
			id: z.string(),
			name: z.string(),
			input: z.record(z.string(), z.unknown()),
			output: z.unknown().optional(),
			status: z.enum(["pending", "running", "complete", "failed", "skipped"]),
		})
		.strict(),
	z
		.object({
			type: z.literal("question"),
			id: z.string(),
			kind: z.enum(["question", "approval"]),
			question: z.string(),
			options: z.array(z.string()).optional(),
			answer: z.string().optional(),
			dismissed: z.boolean().optional(),
		})
		.strict(),
	z
		.object({
			type: z.literal("widget"),
			key: z.string(),
			version: z.number().int().positive(),
			data: z.record(z.string(), z.unknown()),
		})
		.strict(),
]);

/** A conversation's context as last measured, stored on the conversation. */
export const agentContextSchema = z.object({
	model: z.string(),
	tokens: z.number().int().nonnegative(),
	tokenLimit: z.number().int().positive(),
	status: z.enum(["ready", "compacting"]),
});

const agentUsageSchema = z.object({
	creditsCharged: z.string(),
	modelCalls: z.number(),
});

const agentConversationResponseSchema = z.object({
	queuePaused: z.boolean(),
	inputs: z.array(agentInputSchema).optional(),
	context: agentContextSchema
		.extend({
			percent: z.number().int().min(0).max(100),
			compactable: z.boolean(),
		})
		.nullable(),
	compactions: z
		.array(z.object({ id: z.uuid(), createdAt: z.string().nullable() }))
		.optional(),
	id: z.uuid(),
	agentKey: z.string(),
	title: z.string(),
	userId: z.number().nullable(),
	routineId: z.uuid().nullable(),
	latestRun: z
		.object({
			id: z.uuid(),
			status: agentRunStatusSchema,
			outcome: agentRunOutcomeSchema.nullable(),
			errorMessage: z.string().nullable(),
		})
		.nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
});

const agentMessageResponseSchema = z.object({
	id: z.uuid(),
	conversationId: z.uuid(),
	runId: z.uuid().nullable(),
	position: z.number(),
	role: z.enum(["user", "assistant"]),
	parts: z.array(agentMessagePartSchema),
	createdAt: z.string().nullable(),
});

const agentRunResponseSchema = z.object({
	id: z.uuid(),
	conversationId: z.uuid(),
	routineId: z.uuid().nullable(),
	status: agentRunStatusSchema,
	outcome: agentRunOutcomeSchema.nullable(),
	summary: z.string().nullable(),
	errorMessage: z.string().nullable(),
	usage: agentUsageSchema,
	createdAt: z.string().nullable(),
	startedAt: z.string().nullable(),
	finishedAt: z.string().nullable(),
});

const agentRoutineResponseSchema = z.object({
	id: z.uuid(),
	agentKey: z.string(),
	key: z.string().nullable(),
	source: agentRoutineSourceSchema,
	name: z.string(),
	instructions: z.string(),
	cron: z.string(),
	timezone: z.string(),
	enabled: z.boolean(),
	nextRunAt: z.string().nullable(),
	lastRun: agentRunResponseSchema
		.pick({
			id: true,
			conversationId: true,
			status: true,
			outcome: true,
			createdAt: true,
		})
		.nullable(),
	createdAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
});

const idParams = z.object({ id: z.uuid() });
const noQuery = { string: undefined, formatted: undefined };
const routineBody = z.object({
	name: z.string().trim().min(1).max(255),
	instructions: z.string().trim().min(1).max(20_000),
	cron: z.string().trim().min(1),
	timezone: z.string().trim().min(1),
	enabled: z.boolean(),
});

export const controllerSchemas = {
	getMultipleConversations: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[title]": queryString.schema.filter(false),
					"filter[agentKey]": queryString.schema.filter(false),
					"filter[routineId]": queryString.schema.filter(false),
					"filter[status]": queryString.schema.filter(true, {
						example: "waiting",
					}),
					sort: queryString.schema.sort("updatedAt,createdAt,title"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						title: queryFormatted.schema.filters.single.optional(),
						agentKey: queryFormatted.schema.filters.single.optional(),
						routineId: queryFormatted.schema.filters.single.optional(),
						status: queryFormatted.schema.filters.union.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
				sort: z
					.array(
						z.object({
							key: z.enum(["updatedAt", "createdAt", "title"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		response: z.array(agentConversationResponseSchema),
	} satisfies ControllerSchema,
	createConversation: {
		body: z.object({
			agentKey: z.string().min(1),
			title: z.string().trim().min(1).max(255).optional(),
		}),
		query: noQuery,
		params: undefined,
		response: agentConversationResponseSchema,
	} satisfies ControllerSchema,
	getConversation: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: agentConversationResponseSchema,
	} satisfies ControllerSchema,
	updateConversation: {
		body: z.object({ title: z.string().trim().min(1).max(255) }),
		query: noQuery,
		params: idParams,
		response: agentConversationResponseSchema,
	} satisfies ControllerSchema,
	deleteConversation: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	getMessages: {
		body: undefined,
		query: {
			string: z.object({
				before: z.coerce.number().int().positive().optional().meta({
					description: "Return messages before this position.",
				}),
				limit: z.coerce.number().int().min(1).max(100).default(50),
			}),
			formatted: undefined,
		},
		params: idParams,
		response: z.array(agentMessageResponseSchema),
	} satisfies ControllerSchema,
	sendMessage: {
		body: z.object({
			text: z.string().trim().min(1).max(20_000),
			delivery: agentDeliverySchema.default({ kind: "queue" }),
			requestId: z.uuid(),
		}),
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	updateInput: {
		body: agentInputActionSchema,
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	compactConversation: {
		body: z.object({ requestId: z.uuid() }),
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	respondRun: {
		body: z.object({
			questionId: z.string().min(1),
			answer: z.string().trim().min(1).max(20_000),
		}),
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	cancelRun: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	watchRun: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	getMultipleRoutines: {
		body: undefined,
		query: {
			string: z
				.object({
					"filter[name]": queryString.schema.filter(false),
					"filter[agentKey]": queryString.schema.filter(false),
					sort: queryString.schema.sort("name,createdAt,updatedAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						name: queryFormatted.schema.filters.single.optional(),
						agentKey: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				filterOr: queryFormatted.schema.filterOr,
				sort: z
					.array(
						z.object({
							key: z.enum(["name", "createdAt", "updatedAt"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: undefined,
		response: z.array(agentRoutineResponseSchema),
	} satisfies ControllerSchema,
	createRoutine: {
		body: routineBody.extend({ agentKey: z.string().min(1) }),
		query: noQuery,
		params: undefined,
		response: agentRoutineResponseSchema,
	} satisfies ControllerSchema,
	getRoutine: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: agentRoutineResponseSchema,
	} satisfies ControllerSchema,
	updateRoutine: {
		body: routineBody.partial(),
		query: noQuery,
		params: idParams,
		response: agentRoutineResponseSchema,
	} satisfies ControllerSchema,
	deleteRoutine: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	runRoutine: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: z.object({ conversationId: z.uuid(), runId: z.uuid() }),
	} satisfies ControllerSchema,
	getRoutineRuns: {
		body: undefined,
		query: {
			string: z
				.object({
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				page: queryFormatted.schema.page,
				perPage: queryFormatted.schema.perPage,
			}),
		},
		params: idParams,
		response: z.array(agentRunResponseSchema),
	} satisfies ControllerSchema,
};

export type GetMultipleConversationsQueryParams = z.infer<
	typeof controllerSchemas.getMultipleConversations.query.formatted
>;
export type GetMultipleRoutinesQueryParams = z.infer<
	typeof controllerSchemas.getMultipleRoutines.query.formatted
>;
export type GetRoutineRunsQueryParams = z.infer<
	typeof controllerSchemas.getRoutineRuns.query.formatted
>;
