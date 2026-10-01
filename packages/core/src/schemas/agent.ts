import z from "zod";
import constants from "../constants/constants.js";
import type { ControllerSchema } from "../exports/types.js";
import {
	aiModelCatalogSchema,
	aiModelSelectionSchema,
} from "../libs/agent/model-selection.js";
import { resolvedAdminCopySchema } from "../libs/i18n/index.js";
import type {
	AgentApprovalMode,
	AgentDelivery,
	AgentInput,
	AgentInputAction,
	AgentInteractionAction,
	AgentMessagePart,
	AgentRoutineConversationMode,
	AgentRoutineSource,
	AgentRoutineTrigger,
	AgentRunOutcome,
	AgentRunResultPart,
	AgentRunStatus,
	AgentTitleStatus,
	AgentToolDetails,
	AgentToolDisplay,
	AgentToolStatus,
	AgentToolSummary,
} from "../types/response.js";
import {
	agentReferenceInputSchema,
	agentReferenceSchema,
	agentReferenceSnapshotSchema,
} from "./agent-references.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import { mediaResponseSchema, uploadSessionResponseSchema } from "./media.js";

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
	references: z.array(agentReferenceInputSchema).default([]),
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

export const agentRoutineTriggerSchema = z.enum([
	"schedule",
	"manual",
]) satisfies z.ZodType<AgentRoutineTrigger>;

export const agentRoutineConversationModeSchema = z.enum([
	"new",
	"reuse",
]) satisfies z.ZodType<AgentRoutineConversationMode>;

export const agentRunStatusSchema = z.enum([
	"queued",
	"running",
	"waiting",
	"interrupted",
	"completed",
	"failed",
	"cancelled",
]) satisfies z.ZodType<AgentRunStatus>;

export const agentApprovalModeSchema = z.enum([
	"confirm-all",
	"tool-defaults",
	"automatic",
]) satisfies z.ZodType<AgentApprovalMode>;

export const agentTitleStatusSchema = z.enum([
	"provisional",
	"generated",
	"user_set",
]) satisfies z.ZodType<AgentTitleStatus>;

export const agentInteractionActionSchema = z.enum([
	"submit",
	"cancel",
]) satisfies z.ZodType<AgentInteractionAction>;

export const agentRunOutcomeSchema = z.enum([
	"done",
	"nothing_to_report",
	"needs_review",
]) satisfies z.ZodType<AgentRunOutcome>;

/** How a tool asks for input: the prompt and where its widget is shown. */
export const agentInteractionRequestSchema = z.object({
	title: z.string().min(1).max(2000),
	placement: z.enum(["inline", "composer"]),
});

export const agentInteractionSchema = agentInteractionRequestSchema
	.extend({
		id: z.string().min(1),
		toolCallId: z.string().min(1),
		answeredByUserId: z.number().optional(),
		approval: z
			.object({
				toolName: z.string(),
				input: z.record(z.string(), z.unknown()),
			})
			.optional(),
		approvals: z
			.array(
				z.object({
					toolCallId: z.string().min(1),
					toolName: z.string().min(1),
					title: z.string(),
					input: z.record(z.string(), z.unknown()),
				}),
			)
			.min(2)
			.max(constants.agent.readConcurrency)
			.optional(),
	})
	.and(
		z.discriminatedUnion("status", [
			z.object({ status: z.literal("pending") }),
			z.object({
				status: z.literal("answered"),
				response: z.record(z.string(), z.unknown()),
			}),
			z.object({ status: z.literal("dismissed") }),
			z.object({ status: z.literal("cancelled") }),
		]),
	);

export const agentWidgetSchema = z
	.object({
		type: z.literal("widget"),
		key: z.string().min(1),
		version: z.number().int().positive(),
		data: z.record(z.string(), z.unknown()),
		interaction: agentInteractionSchema.optional(),
	})
	.strict();

export const agentInteractiveWidgetSchema = agentWidgetSchema.extend({
	interaction: agentInteractionSchema,
});

const agentToolDisplaySchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("text"), text: z.string() }),
	z.object({ kind: z.literal("search"), query: z.string() }),
	z.object({ kind: z.literal("fetch"), url: z.string() }),
	z.object({ kind: z.literal("skill"), name: z.string() }),
	z.object({ kind: z.literal("progress"), message: z.string() }),
]) satisfies z.ZodType<AgentToolDisplay>;

export const agentToolDetailsSchema = z
	.object({
		type: z.literal("tool"),
		id: z.string(),
		name: z.string(),
		title: resolvedAdminCopySchema.optional(),
		display: agentToolDisplaySchema.optional(),
		input: z.record(z.string(), z.unknown()),
		output: z.unknown().optional(),
		status: z.enum([
			"pending",
			"running",
			"complete",
			"failed",
			"skipped",
		]) satisfies z.ZodType<AgentToolStatus>,
	})
	.strict() satisfies z.ZodType<AgentToolDetails>;

const agentToolSummarySchema = agentToolDetailsSchema
	.omit({ input: true, output: true })
	.extend({
		detailsAvailable: z.boolean(),
	}) satisfies z.ZodType<AgentToolSummary>;

const agentTextPartSchema = z
	.object({ type: z.literal("text"), text: z.string() })
	.strict();
const agentReferencePartSchema = z
	.object({
		type: z.literal("reference"),
		reference: agentReferenceSnapshotSchema,
	})
	.strict();

const agentRoutinePartSchema = z
	.object({
		type: z.literal("routine"),
		name: z.string(),
		instructions: z.string(),
		trigger: agentRoutineTriggerSchema,
	})
	.strict();

const agentRunResultPartSchema = z
	.object({
		type: z.literal("run-result"),
		outcome: agentRunOutcomeSchema,
		summary: z.string(),
		finishedAt: z.string(),
	})
	.strict() satisfies z.ZodType<AgentRunResultPart>;

/** Stored parts retain full tool values for recovery, audit and model context. */
export const agentMessagePartSchema = z.discriminatedUnion("type", [
	agentTextPartSchema,
	agentReferencePartSchema,
	agentRoutinePartSchema,
	agentToolDetailsSchema,
	agentWidgetSchema,
]);

export type StoredAgentMessagePart = z.output<typeof agentMessagePartSchema>;

const agentChatPartSchema = z.discriminatedUnion("type", [
	agentTextPartSchema,
	agentReferencePartSchema,
	agentRoutinePartSchema,
	agentRunResultPartSchema,
	agentToolSummarySchema,
	agentWidgetSchema,
]) satisfies z.ZodType<AgentMessagePart>;

/** A conversation's context as last measured, stored on the conversation. */
export const agentContextSchema = z.object({
	model: z.string(),
	tokens: z.number().int().nonnegative(),
	tokenLimit: z.number().int().positive(),
	status: z.enum(["ready", "compacting"]),
});

const agentUsageSchema = z.object({
	credits: z.number(),
	modelCalls: z.number(),
});

const agentConversationDetailsResponseSchema = z.object({
	sources: z.array(
		z.object({
			url: z.string(),
			title: z.string(),
			read: z.boolean(),
		}),
	),
});

const agentConversationResponseSchema = z.object({
	approvalMode: agentApprovalModeSchema,
	modelSelection: aiModelSelectionSchema.nullable(),
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
	titleStatus: agentTitleStatusSchema,
	titleGenerationRequestedAt: z.string().nullable(),
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
	parts: z.array(agentChatPartSchema),
	createdAt: z.string().nullable(),
});

const agentCatalogResponseSchema = z.object({
	enabled: z.boolean(),
	agents: z.array(
		z.object({
			key: z.string(),
			name: z.string(),
			description: z.string(),
			features: z.object({
				media: z.object({ upload: z.boolean(), attach: z.boolean() }),
				documents: z.object({ attach: z.boolean() }),
			}),
			capabilities: z.object({
				mediaAnalysis: z.object({ mimeTypes: z.array(z.string()) }).nullable(),
				fileRead: z.object({ mimeTypes: z.array(z.string()) }).nullable(),
				webSearch: z.boolean(),
				webRead: z.boolean(),
			}),
			suggestions: z.array(
				z.object({
					title: resolvedAdminCopySchema,
					description: resolvedAdminCopySchema,
					message: resolvedAdminCopySchema,
				}),
			),
			tools: z.array(
				z.object({
					name: z.string(),
					title: resolvedAdminCopySchema,
					requiresApproval: z.boolean(),
					interactive: z.boolean(),
					permissions: z.array(z.string()),
				}),
			),
		}),
	),
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

/** Per-tool settings for a routine, keyed by tool name. Missing settings use the tool's defaults. */
export const routineToolsSchema = z.record(
	z.string().min(1).max(128),
	z.object({ requiresApproval: z.boolean().optional() }).strict(),
);

const agentRoutineResponseSchema = z.object({
	id: z.uuid(),
	agentKey: z.string(),
	key: z.string().nullable(),
	source: agentRoutineSourceSchema,
	name: z.string(),
	instructions: z.string(),
	conversationMode: agentRoutineConversationModeSchema,
	conversationId: z.uuid().nullable(),
	modelSelection: aiModelSelectionSchema.nullable(),
	tools: routineToolsSchema,
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
	conversationMode: agentRoutineConversationModeSchema.optional(),
	tools: routineToolsSchema.optional(),
	name: z.string().trim().min(1).max(255),
	instructions: z.string().trim().min(1).max(20_000),
	/** Null uses the agent's default model. */
	modelSelection: aiModelSelectionSchema.nullable().optional(),
	cron: z.string().trim().min(1),
	timezone: z.string().trim().min(1),
	enabled: z.boolean(),
});

export const controllerSchemas = {
	createUploadSession: {
		body: z.object({
			agentKey: z.string().trim().min(1).meta({
				description: "The agent the file is attached to",
				example: "assistant",
			}),
			fileName: z.string().trim().meta({
				description: "The file name",
				example: "brief.pdf",
			}),
			mimeType: z.string().trim().meta({
				description: "The file's MIME type",
				example: "application/pdf",
			}),
			size: z.number().nonnegative().meta({
				description: "The file size in bytes",
				example: 1048576,
			}),
		}),
		params: undefined,
		query: noQuery,
		response: uploadSessionResponseSchema,
	} satisfies ControllerSchema,
	createUpload: {
		body: z.object({
			agentKey: z.string().trim().min(1).meta({
				description: "The agent the file is attached to",
				example: "assistant",
			}),
			key: z.string().trim().meta({
				description: "The uploaded media key",
				example: "private/123e4567e89b12d3a456426614174000",
			}),
			fileName: z.string().trim().meta({
				description: "The file name",
				example: "brief.pdf",
			}),
			width: z.number().positive().optional().meta({
				description: "The image or video width",
				example: 1200,
			}),
			height: z.number().positive().optional().meta({
				description: "The image or video height",
				example: 800,
			}),
		}),
		params: undefined,
		query: noQuery,
		response: mediaResponseSchema,
	} satisfies ControllerSchema,
	getDefinitions: {
		body: undefined,
		params: undefined,
		query: noQuery,
		response: agentCatalogResponseSchema,
	} satisfies ControllerSchema,
	getModels: {
		body: undefined,
		params: z.object({ agentKey: z.string().min(1) }),
		query: {
			string: z.object({ routineId: z.uuid().optional() }),
			formatted: undefined,
		},
		response: aiModelCatalogSchema,
	} satisfies ControllerSchema,
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
			approvalMode: agentApprovalModeSchema.optional(),
			modelSelection: aiModelSelectionSchema.optional(),
			/** Lets the admin open the chat before it is saved. */
			id: z.uuid().optional(),
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
	getConversationDetails: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: agentConversationDetailsResponseSchema,
	} satisfies ControllerSchema,
	getMediaPreviews: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: z.array(mediaResponseSchema),
	} satisfies ControllerSchema,
	getReferences: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: z.array(agentReferenceSchema),
	} satisfies ControllerSchema,
	deleteReference: {
		body: undefined,
		query: noQuery,
		params: z.object({ id: z.uuid(), referenceId: z.uuid() }),
		response: undefined,
	} satisfies ControllerSchema,
	updateConversation: {
		body: z.object({
			title: z.string().trim().min(1).max(255).optional(),
			approvalMode: agentApprovalModeSchema.optional(),
			modelSelection: aiModelSelectionSchema.optional(),
		}),
		query: noQuery,
		params: idParams,
		response: agentConversationResponseSchema,
	} satisfies ControllerSchema,
	generateConversationTitle: {
		body: undefined,
		query: noQuery,
		params: idParams,
		response: z.object({ title: z.string() }),
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
	getToolDetails: {
		body: undefined,
		query: noQuery,
		params: z.object({
			id: z.uuid(),
			messageId: z.uuid(),
			toolCallId: z.string().min(1),
		}),
		response: agentToolDetailsSchema,
	} satisfies ControllerSchema,
	sendMessage: {
		body: z
			.object({
				text: z.string().trim().max(20_000),
				references: z.array(agentReferenceInputSchema).max(50).default([]),
				delivery: agentDeliverySchema.default({ kind: "queue" }),
				requestId: z.uuid(),
			})
			.refine((input) => input.text.length > 0 || input.references.length > 0, {
				path: ["text"],
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
	retryConversation: {
		body: z.object({ requestId: z.uuid() }),
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	respondRun: {
		body: z.object({
			interactionId: z.string().min(1),
			action: agentInteractionActionSchema,
			response: z
				.record(z.string(), z.unknown())
				.refine((value) => JSON.stringify(value).length <= 20_000),
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
					"filter[status]": queryString.schema.filter(true, {
						example: "completed",
					}),
					"filter[conversationId]": queryString.schema.filter(false),
					sort: queryString.schema.sort("createdAt"),
					page: queryString.schema.page,
					perPage: queryString.schema.perPage,
				})
				.meta(queryString.meta),
			formatted: z.object({
				filter: z
					.object({
						status: queryFormatted.schema.filters.union.optional(),
						conversationId: queryFormatted.schema.filters.single.optional(),
					})
					.optional(),
				sort: z
					.array(
						z.object({
							key: z.enum(["createdAt"]),
							direction: z.enum(["asc", "desc"]),
						}),
					)
					.optional(),
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
