import type { AgentStreamEvent } from "@lucidcms/types";
import z from "zod";
import { agentScreenSchema } from "../../schemas/agent-screen.js";
import {
	agentConfirmationModeSchema,
	type agentContextSchema,
	agentInteractionActionSchema,
	agentRunOutcomeSchema,
	routineToolSettingsSchema,
} from "../../schemas/agent.js";
import type { AiModelConfig } from "../../types/config.js";
import type {
	AgentInteractionAction,
	AgentRoutineConversationMode,
	AgentRoutineEvent,
	AgentRoutineSchedule,
	AgentRoutineToolSettings,
	AiModelSelection,
	MediaGenerationType,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../i18n/types.js";
import type { JobScheduleTiming } from "../jobs/types.js";
import { cmsAiUsageSchema } from "../lucid-remote/schema/ai.js";
import type { SkillDefinition } from "../skills/types.js";
import type { AgentToolDefinition } from "../tools/types.js";
import {
	agentInteractiveWidgetSchema,
	agentMessagePartSchema,
} from "./messages.js";
import { aiModelSelectionSchema } from "./model-selection.js";

export const toolCallSchema = z.object({
	id: z.string(),
	name: z.string(),
	input: z.record(z.string(), z.unknown()),
});

/** The transcript format exchanged with the remote model service. */
const modelMessageSchema = z.discriminatedUnion("role", [
	z.object({ role: z.literal("user"), content: z.string() }),
	z.object({
		role: z.literal("assistant"),
		content: z.string().optional(),
		toolCalls: z.array(toolCallSchema).optional(),
		reasoningDetails: z.array(z.record(z.string(), z.json())).optional(),
	}),
	z.object({
		role: z.literal("tool"),
		toolCallId: z.string(),
		name: z.string(),
		output: z.unknown(),
	}),
]);

export const modelEventSchema = z.discriminatedUnion("type", [
	/** The turn's model family ID, matching the catalogue, and its input limit. */
	z.object({
		type: z.literal("start"),
		model: z.string(),
		inputTokenLimit: z.number().int().positive(),
		toolLimit: z.number().int().positive(),
		instructionTokens: z.number().int().nonnegative().optional(),
	}),
	z.object({ type: z.literal("text-delta"), text: z.string() }),
	toolCallSchema.extend({ type: z.literal("tool-call") }),
	z.object({
		type: z.literal("finish"),
		requestId: z.string(),
		usage: cmsAiUsageSchema,
		reasoningDetails: z.array(z.record(z.string(), z.json())).optional(),
	}),
	z.object({ type: z.literal("error"), message: z.string() }),
]);

/** Everything needed to resume a run exactly where it stopped. */
export const checkpointSchema = z.object({
	version: z.literal(1),
	/** Run mode fixed at creation, independent of later routine deletion. */
	mode: z.enum(["chat", "routine"]),
	/** The model and effort for this run, resolved once when it starts. */
	selection: aiModelSelectionSchema.optional(),
	/** Captured when the run starts, so changing chat settings never changes a pending decision. */
	confirmationMode: agentConfirmationModeSchema,
	/** Routine tool settings captured when this run starts. */
	routineTools: routineToolSettingsSchema.optional(),
	/** Input receipts survive compaction and a crash before acknowledgement. */
	inputIds: z.array(z.uuid()).optional(),
	/** The admin screen the person's latest message came from, which answers builder tools. */
	screen: agentScreenSchema.optional(),
	messages: z.array(
		modelMessageSchema.and(z.object({ sourceId: z.uuid().optional() })),
	),
	/** A cursor exists only while saved messages are being loaded. */
	historyAfter: z.number().int().nonnegative().optional(),
	/** Model context for the run's request, added once history has loaded. */
	extraContext: z.string().optional(),
	purpose: z.literal("compact").optional(),
	/** The run's model family and input limit last reported by the API. */
	model: z
		.object({
			id: z.string(),
			tokenLimit: z.number().int().positive(),
			toolLimit: z.number().int().positive(),
			instructionTokens: z.number().int().nonnegative().optional(),
		})
		.optional(),
	/** Input tokens the provider counted for the last request, and how many messages it held. */
	measured: z
		.object({
			tokens: z.number().int().nonnegative(),
			messages: z.number().int().nonnegative(),
		})
		.optional(),
	/** Some context was summarised or truncated, so the history tool is offered. */
	trimmed: z.boolean().optional(),
	/** Automatic compaction failed, so this run continues without retrying it. */
	compactionFailed: z.boolean().optional(),
	/** The API rejected a request as too large: context compacts once, then the turn retries. */
	overflow: z.enum(["compacting", "retrying"]).optional(),
	compaction: z
		.object({
			requestId: z.uuid(),
			count: z.number().int().positive(),
			throughPosition: z.number().int().positive(),
		})
		.optional(),
	nudges: z.number().int().nonnegative(),
	/** Whether an earlier turn of this run produced a text reply. */
	replied: z.boolean().optional(),
	/** Last routine reply without tool calls, used as the fallback summary. */
	reply: z.string().optional(),
	requestId: z.uuid(),
	messageId: z.uuid(),
	parts: z.array(agentMessagePartSchema),
	calls: z.array(toolCallSchema),
	cursor: z.number().int().nonnegative(),
	phase: z.enum(["model", "tools"]),
	/** The interaction the run is waiting on, and the person's answer once given. */
	pending: z
		.object({
			widget: agentInteractiveWidgetSchema,
			answer: z
				.discriminatedUnion("action", [
					z.object({
						action: z.literal("submit"),
						response: z.record(z.string(), z.unknown()),
					}),
					z.object({ action: z.literal("cancel") }),
				])
				.optional(),
		})
		.optional(),
	/** The latest interaction the run saved an answer for, so a retry that resubmits it carries on rather than answering again. */
	answered: z
		.object({
			interactionId: z.string(),
			userId: z.number().int(),
			action: agentInteractionActionSchema,
		})
		.optional(),
	inFlightWrite: z.string().optional(),
	finish: z
		.object({ outcome: agentRunOutcomeSchema, summary: z.string() })
		.optional(),
});

/** A tool as it is offered to the remote model. */
export type ModelToolDefinition = {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
};

export type ToolCall = z.infer<typeof toolCallSchema>;
export type ModelMessage = z.infer<typeof modelMessageSchema>;
export type ModelEvent = z.infer<typeof modelEventSchema>;
export type ModelUsage = Extract<ModelEvent, { type: "finish" }>["usage"];
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type ConversationContext = z.infer<typeof agentContextSchema>;
export type RunMode = Checkpoint["mode"];
export type RoutineToolSettings = z.infer<typeof routineToolSettingsSchema>;

/** A person's answer to the interaction a run waits on. */
export type AgentRunAnswer = {
	interactionId: string;
	response: Record<string, unknown>;
	action: AgentInteractionAction;
	userId: number;
};

/** Starts or continues a run, answering its pending interaction when given. */
export type AgentRunStart = {
	runId: string;
	answer?: AgentRunAnswer;
};

/** Follows a run's events for one viewer, resuming from a stream cursor when given. */
export type AgentRunWatch = {
	runId: string;
	cursor?: string;
	signal: AbortSignal;
	emit: (event: AgentStreamEvent, id?: string) => Promise<void>;
};

/** Executes and streams agent runs beyond their initiating request or job, such as in a Cloudflare Durable Object, with inline execution when the runtime supplies no runner. */
export type AgentRunnerInstance = {
	type: "agent-runner";
	key: string;
	/** Starts or continues a run and returns a live cursor that follows it from the first event. */
	start: ServiceFn<[AgentRunStart], { cursor: string }>;
	/** Streams a run's events to a viewer. */
	watch: ServiceFn<[AgentRunWatch], undefined>;
};

export type DefineRoutineOptions<Key extends string> = {
	/** Stable key, unique within the agent, using lowercase letters, numbers and single hyphens. */
	key: Key;
	name: string;
	/** What each run should do. Common indentation is removed, so template literals can be indented. */
	instructions: string;
	/** New chats by default. Reuse continues the routine's saved chat, including human follow-ups. */
	conversationMode?: AgentRoutineConversationMode;
	/** Routine model selection, such as `{ modelId: "openai/gpt-luna", reasoningEffort: "low" }`, defaulting to the agent's model. */
	model?: AiModelSelection;
	/**
	 * Per-tool confirmation overrides keyed by tool name, such as `{ save_note: { requiresConfirmation: false } }`.
	 * @remarks Omitted settings keep tool defaults; system runs refuse confirmation unless overridden with `requiresConfirmation: false`.
	 */
	toolSettings?: Readonly<Record<string, AgentRoutineToolSettings>>;
} & (
	| {
			schedule: JobScheduleTiming;
			/**
			 * Content changes that also start a run, such as `{ event: "media:created", filter: { mediaTypes: ["image"] } }`.
			 * @remarks Changes from routine chats are ignored, and nearby changes share a run.
			 */
			events?: readonly AgentRoutineEvent[];
	  }
	| {
			schedule?: JobScheduleTiming;
			events: readonly [AgentRoutineEvent, ...AgentRoutineEvent[]];
	  }
);

/**
 * An unattended system routine created with `defineRoutine`.
 * @remarks Required interactions are excluded; confirmation requests are refused.
 */
export type RoutineDefinition<Key extends string = string> = {
	readonly type: "routine-definition";
	readonly key: Key;
	readonly name: string;
	readonly instructions: string;
	readonly conversationMode: AgentRoutineConversationMode;
	readonly model?: AiModelSelection;
	readonly toolSettings: Readonly<Record<string, AgentRoutineToolSettings>>;
	/** Null when the routine only runs on events. */
	readonly schedule: Readonly<AgentRoutineSchedule> | null;
	readonly events: readonly AgentRoutineEvent[];
};

export type DefineAgentOptions<Key extends string> = {
	/** Stable, unique key using lowercase letters, numbers and single hyphens. Changing it detaches saved chats and routines. */
	key: Key;
	/** Set to false to turn the agent off without removing it. Its chats and routines are kept. Defaults to true. */
	enabled?: boolean;
	/** Shows the agent in the admin sidebar by default, with `false` hiding it there while keeping its chats available on agent pages. */
	sidebar?: boolean;
	/** Agent name translated for each viewer, using the default language in prompts. */
	name: AdminCopyInput;
	/** Description translated for each viewer to help them choose an agent. */
	description: AdminCopyInput;
	/** Added to the agent's system prompt. Common indentation is removed. */
	instructions?: string;
	/** The tools the agent can call, such as `agentTools.read()` or your own `defineAgentTool` tools. Bundles are flattened. */
	tools?: readonly (AgentToolDefinition | readonly AgentToolDefinition[])[];
	skills?: readonly SkillDefinition[];
	/** Built-in features and the tools behind them. Every feature is enabled unless set to false. */
	features?: AgentFeatureOptions;
	/** The default model and the models people can choose. Leave out to offer every model the Lucid service provides. */
	models?: AiModelConfig<AiModelSelection>;
	/** Messages people can select to start a chat. Plain message strings have their common indentation removed. */
	suggestions?: readonly {
		title: AdminCopyInput;
		description: AdminCopyInput;
		message: AdminCopyInput;
	}[];
	/**
	 * System routines triggered by schedules or content events that authorized users can pause, resume or run.
	 * @remarks Requires the agent's manage-code-routines permission.
	 */
	routines?: readonly RoutineDefinition[];
};

export type AgentFeatures = {
	media: {
		/** Let people upload personal files in the composer. */
		upload: boolean;
		/** Registers the tool that adds personal uploads and generated media to the library. */
		addToLibrary: boolean;
		/** Let people select existing media from the library. */
		attach: boolean;
		/** Register Lucid's media analysis tool. Disable when providing your own. */
		analyze: boolean;
		/** Register Lucid's text file reader. Disable when providing your own. */
		readFile: boolean;
		/**
		 * Registers generation tools requiring each media type's AI feature and permission.
		 * @remarks Composer generation also requires `upload`.
		 */
		generate: Record<MediaGenerationType, boolean>;
	};
	documents: {
		/** Let people select CMS documents in the composer. */
		attach: boolean;
	};
	requests: {
		/** Let people add requests to a message, eg. selected ones from the requests list. */
		attach: boolean;
	};
	/** Offers builder tools on document screens, including unsaved content, and leaves edits unsaved for the person to review. */
	builder: {
		/** Register lucid_builder_read and lucid_builder_focus. */
		read: boolean;
		/** Registers `lucid_builder_update`, requiring `read` and inheriting its default. */
		edit: boolean;
	};
	/** Controls reading and proposing changes to memories configured in `ai.memory`. */
	memory: {
		/** Adds enabled shared memories and the acting user's personal memories to instructions. */
		read: boolean;
		/** Registers reviewed `lucid_memory_save` and `lucid_memory_delete` tools for chats, requiring `read` and inheriting its default. */
		save: boolean;
	};
	web: {
		/** Register Lucid's web search tool. Disable when providing your own. */
		search: boolean;
		/** Register Lucid's webpage reading tool. Disable when providing your own. */
		read: boolean;
		/** Limit Lucid's web tools to these domains. Omit to allow public sites. */
		allowedDomains?: string[];
	};
};

/** Lucid's per-type media generation tools: a boolean turns every type on or off, and omitted types stay on. */
export type AgentMediaGenerateOptions =
	| boolean
	| Partial<AgentFeatures["media"]["generate"]>;

/** Configures built-in `defineAgent` features, enabled unless explicitly disabled. */
export type AgentFeatureOptions = {
	[Key in keyof AgentFeatures]?: Key extends "media"
		? Partial<Omit<AgentFeatures["media"], "generate">> & {
				generate?: AgentMediaGenerateOptions;
			}
		: Partial<AgentFeatures[Key]>;
};

/** An agent created with `defineAgent`, with its own chat and routine permissions. */
export type AgentDefinition<Key extends string = string> = {
	readonly type: "agent-definition";
	readonly key: Key;
	readonly enabled: boolean;
	readonly sidebar: boolean;
	readonly name: ResolvedAdminCopy;
	readonly description: ResolvedAdminCopy;
	readonly instructions: string;
	readonly tools: readonly AgentToolDefinition[];
	readonly skills: readonly SkillDefinition[];
	/** Normalized built-in features. `tools` includes the tools they enable. */
	readonly features: AgentFeatures;
	readonly models?: AiModelConfig<AiModelSelection>;
	readonly suggestions: readonly {
		readonly title: ResolvedAdminCopy;
		readonly description: ResolvedAdminCopy;
		readonly message: ResolvedAdminCopy;
	}[];
	readonly routines: readonly RoutineDefinition[];
};
