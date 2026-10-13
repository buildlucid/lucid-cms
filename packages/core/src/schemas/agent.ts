import type {
	AgentDelivery,
	AgentInput,
	AgentInputAction,
} from "@lucidcms/types";
import z from "zod";
import constants from "../constants/constants.js";
import type { ControllerSchema } from "../exports/types.js";
import {
	aiModelCatalogSchema,
	aiModelSelectionSchema,
} from "../libs/agent/model-selection.js";
import { resolvedAdminCopySchema } from "../libs/i18n/index.js";
import type {
	Agent,
	AgentCapabilities,
	AgentConfirmationMode,
	AgentConversationKind,
	AgentInteractionAction,
	AgentMessagePart,
	AgentRoutineConversationMode,
	AgentRoutineSource,
	AgentRoutineToolSettings,
	AgentRoutineTrigger,
	AgentRunOutcome,
	AgentRunResultPart,
	AgentRunStatus,
	AgentTitleStatus,
	AgentToolDetails,
	AgentToolStatus,
	AgentToolSummary,
} from "../types/response.js";
import {
	agentReferenceInputSchema,
	agentReferenceSchema,
	agentReferenceSnapshotSchema,
	agentResourceSchema,
} from "./agent-references.js";
import { agentScreenSchema } from "./agent-screen.js";
import { queryFormatted, queryString } from "./helpers/querystring.js";
import {
	mediaListItemResponseSchema,
	mediaResponseSchema,
	uploadSessionResponseSchema,
} from "./media.js";

export const agentConversationKindSchema = z.enum([
	"chat",
	"own-routine",
	"code-routine",
]) satisfies z.ZodType<AgentConversationKind>;

const agentDeliverySchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("queue") }).strict(),
	z.object({ kind: z.literal("steer"), targetRunId: z.uuid() }).strict(),
]) satisfies z.ZodType<AgentDelivery>;

const agentInputSchema = z.object({
	id: z.uuid(),
	text: z.string(),
	references: z.array(agentReferenceInputSchema).default([]),
	screen: agentScreenSchema.nullable(),
	status: z.enum(["pending", "claimed"]),
	delivery: agentDeliverySchema,
}) satisfies z.ZodType<AgentInput>;

const agentInputActionSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("cancel"), id: z.uuid() }),
	z.object({
		kind: z.literal("steer"),
		id: z.uuid(),
		targetRunId: z.uuid(),
	}),
	z.object({ kind: z.literal("resume") }),
	z.object({ kind: z.literal("clear") }),
]) satisfies z.ZodType<AgentInputAction>;

/** Code routines are synced from config; own routines are created by people. */
export const agentRoutineSourceSchema = z.enum([
	"code",
	"own",
]) satisfies z.ZodType<AgentRoutineSource>;

const agentRoutineTriggerSchema = z.enum([
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

export const agentConfirmationModeSchema = z.enum([
	"confirm-all",
	"tool-defaults",
	"automatic",
]) satisfies z.ZodType<AgentConfirmationMode>;

export const agentTitleStatusSchema = z.enum([
	"provisional",
	"generated",
	"user_set",
]) satisfies z.ZodType<AgentTitleStatus>;

const agentInteractionActionSchema = z.enum([
	"submit",
	"cancel",
]) satisfies z.ZodType<AgentInteractionAction>;

export const agentRunOutcomeSchema = z.enum([
	"done",
	"nothing_to_report",
	"needs_review",
]) satisfies z.ZodType<AgentRunOutcome>;

/** Where a tool's interaction widget is shown. */
export const agentInteractionPlacementSchema = z.enum(["inline", "composer"]);

const agentInteractionSchema = z
	.object({
		/** What the person is asked, translated for each viewer. */
		title: resolvedAdminCopySchema,
		placement: agentInteractionPlacementSchema,
		id: z.string().min(1),
		toolCallId: z.string().min(1),
		answeredByUserId: z.number().optional(),
		confirmation: z
			.object({
				toolName: z.string(),
				input: z.record(z.string(), z.unknown()),
			})
			.optional(),
		confirmations: z
			.array(
				z.object({
					toolCallId: z.string().min(1),
					toolName: z.string().min(1),
					title: resolvedAdminCopySchema,
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

export const agentToolDetailsSchema = z
	.object({
		type: z.literal("tool"),
		id: z.string(),
		name: z.string(),
		title: resolvedAdminCopySchema.optional(),
		summary: resolvedAdminCopySchema,
		input: z.record(z.string(), z.unknown()),
		output: z.unknown().optional(),
		outputVersion: z.number().int().positive().optional(),
		status: z.enum([
			"pending",
			"running",
			"complete",
			"failed",
			"skipped",
		]) satisfies z.ZodType<AgentToolStatus>,
		changes: z.array(agentResourceSchema).optional(),
	})
	.strict() satisfies z.ZodType<AgentToolDetails>;

const agentToolSummarySchema = agentToolDetailsSchema
	.omit({ input: true, output: true })
	.extend({
		detailsAvailable: z.boolean(),
	}) satisfies z.ZodType<AgentToolSummary>;

export const agentTextPartSchema = z
	.object({ type: z.literal("text"), text: z.string() })
	.strict();
export const agentReferencePartSchema = z
	.object({
		type: z.literal("reference"),
		reference: agentReferenceSnapshotSchema,
	})
	.strict();

export const agentScreenPartSchema = z
	.object({ type: z.literal("screen"), screen: agentScreenSchema })
	.strict();

export const agentRoutinePartSchema = z
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

/** Client-facing message parts with summarized tool calls, distinct from storage in `libs/agent/messages.ts`. */
const agentChatPartSchema = z.discriminatedUnion("type", [
	agentTextPartSchema,
	agentReferencePartSchema,
	agentScreenPartSchema,
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
	confirmationMode: agentConfirmationModeSchema,
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
	titleStatus: z.enum([...agentTitleStatusSchema.options, "generating"]).meta({
		description:
			"How the title was set. Generating means an automatic title is on its way, so poll for it",
	}),
	kind: agentConversationKindSchema,
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

const mediaGenerationFlagsSchema = z.object({
	image: z.boolean(),
	audio: z.boolean(),
}) satisfies z.ZodType<Agent["features"]["media"]["generate"]>;
const mimeTypesSchema = z.object({ mimeTypes: z.array(z.string()) }).nullable();

const agentCatalogResponseSchema = z.object({
	enabled: z.boolean(),
	agents: z.array(
		z.object({
			key: z.string(),
			name: resolvedAdminCopySchema,
			description: resolvedAdminCopySchema,
			features: z.object({
				media: z.object({
					upload: z.boolean(),
					attach: z.boolean(),
					generate: mediaGenerationFlagsSchema,
				}),
				documents: z.object({ attach: z.boolean() }),
				requests: z.object({ attach: z.boolean() }),
				builder: z.object({ read: z.boolean(), edit: z.boolean() }),
			}) satisfies z.ZodType<Agent["features"]>,
			capabilities: z.object({
				media: z.object({
					analyze: mimeTypesSchema,
					readFile: mimeTypesSchema,
					generate: mediaGenerationFlagsSchema,
				}),
				web: z.object({ search: z.boolean(), read: z.boolean() }),
			}) satisfies z.ZodType<AgentCapabilities>,
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
					requiresConfirmation: z.boolean(),
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
export const routineToolSettingsSchema = z.record(
	z.string().min(1).max(128),
	z
		.object({ requiresConfirmation: z.boolean().optional() })
		.strict() satisfies z.ZodType<AgentRoutineToolSettings>,
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
	toolSettings: routineToolSettingsSchema,
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
	toolSettings: routineToolSettingsSchema.optional(),
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
			posterId: z.number().int().positive().optional().meta({
				description:
					"A video's poster: another of your uploads, such as a captured frame",
				example: 42,
			}),
			origin: z.enum(["ai_generated", "ai_modified"]).optional().meta({
				description:
					"How the file was made, when it was generated with Lucid AI. Requires aiGenerationRequestId.",
				example: "ai_generated",
			}),
			aiGenerationRequestId: z.uuid().optional().meta({
				description: "The Lucid AI generation request that made the file",
				example: "123e4567-e89b-12d3-a456-426614174000",
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
					"filter[agentKey]": queryString.schema.filter(true, {
						example: "assistant,seo",
					}),
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
						agentKey: queryFormatted.schema.filters.union.optional(),
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
			confirmationMode: agentConfirmationModeSchema.optional(),
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
		response: z.array(mediaListItemResponseSchema),
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
			confirmationMode: agentConfirmationModeSchema.optional(),
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
	branchConversation: {
		body: z.object({
			messageId: z.uuid().meta({
				description:
					"The finished reply to branch from. It and every message before it are copied.",
			}),
		}),
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
				screen: agentScreenSchema.optional().meta({
					description:
						"The admin screen the message was sent from. The document builder answers the agent's builder tools.",
				}),
				delivery: agentDeliverySchema.default({ kind: "queue" }),
				inputId: z.uuid().meta({
					description:
						"A new ID for the input, which becomes its run and message IDs. Resending the same input with it is safe.",
				}),
			})
			.refine((input) => input.text.length > 0 || input.references.length > 0, {
				path: ["text"],
			}),
		query: noQuery,
		params: idParams,
		response: z.object({
			runId: z.uuid().nullable().meta({
				description:
					"The run answering the input, or null while it waits in the queue",
			}),
		}),
	} satisfies ControllerSchema,
	updateInput: {
		body: agentInputActionSchema,
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	compactConversation: {
		body: z.object({
			runId: z.uuid().meta({
				description:
					"A new ID for the compaction run. Resending with it is safe.",
			}),
		}),
		query: noQuery,
		params: idParams,
		response: undefined,
	} satisfies ControllerSchema,
	retryConversation: {
		body: z.object({
			runId: z.uuid().meta({
				description: "A new ID for the retry run. Resending with it is safe.",
			}),
		}),
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
				.refine(
					(value) =>
						JSON.stringify(value).length <=
						constants.agent.limits.responseChars,
				),
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
