import z from "zod";
import {
	agentApprovalModeSchema,
	type agentContextSchema,
	agentInteractiveWidgetSchema,
	agentMessagePartSchema,
	agentRunOutcomeSchema,
	routineToolsSchema,
} from "../../schemas/agent.js";
import type {
	AgentRoutineConversationMode,
	AiModelConfig,
	AiModelSelection,
} from "../../types/response.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../i18n/types.js";
import { cmsAiUsageSchema } from "../lucid-remote/schema/ai.js";
import type { SkillDefinition } from "../skills/types.js";
import type { AgentToolDefinition } from "../tools/types.js";
import { aiModelSelectionSchema } from "./model-selection.js";

export const toolCallSchema = z.object({
	id: z.string(),
	name: z.string(),
	input: z.record(z.string(), z.unknown()),
});

/** The transcript format exchanged with the remote model service. */
export const modelMessageSchema = z.discriminatedUnion("role", [
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
	/** The model serving the turn and how much input it accepts. */
	z.object({
		type: z.literal("start"),
		model: z.string(),
		inputTokenLimit: z.number().int().positive(),
		toolLimit: z.number().int().positive(),
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
	/** The model and effort for this run, resolved once when it starts. */
	selection: aiModelSelectionSchema.optional(),
	/** Captured when the run starts, so changing chat settings never changes a pending decision. */
	approvalMode: agentApprovalModeSchema,
	/** Routine tool settings captured when this run starts. */
	routineTools: routineToolsSchema.optional(),
	/** Input receipts survive compaction and a crash before acknowledgement. */
	inputIds: z.array(z.uuid()).optional(),
	messages: z.array(
		modelMessageSchema.and(z.object({ sourceId: z.uuid().optional() })),
	),
	/** A cursor exists only while saved messages are being loaded. */
	historyAfter: z.number().int().nonnegative().optional(),
	/** Model context for the run's request, added once history has loaded. */
	extraContext: z.string().optional(),
	purpose: z.literal("compact").optional(),
	/** The model serving this run and its input limit, as the API last reported. */
	model: z
		.object({
			id: z.string(),
			tokenLimit: z.number().int().positive(),
			toolLimit: z.number().int().positive(),
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
	/** Whether an earlier turn of this run replied with text. A routine run only finishes after replying. */
	replied: z.boolean().optional(),
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
export type RunMode = "chat" | "routine";
export type RoutineTools = z.infer<typeof routineToolsSchema>;

export type DefineRoutineOptions<Key extends string> = {
	/** Stable key, unique within the agent, using lowercase letters, numbers and single hyphens. */
	key: Key;
	name: string;
	/** What each run should do. Common indentation is removed, so template literals can be indented. */
	instructions: string;
	/** New chats by default. Reuse continues the routine's saved chat, including human follow-ups. */
	conversationMode?: AgentRoutineConversationMode;
	/** The model each run uses, eg. `{ modelId: "openai/gpt-6-luna", reasoningEffort: "low" }`. Defaults to the agent's model. */
	model?: AiModelSelection;
	/** Per-tool settings by tool name, eg. `{ save_note: { requiresApproval: true } }`. Omitted tools and settings keep the tool's defaults. */
	tools?: Readonly<RoutineTools>;
	schedule: {
		/** Five-field cron expression with minute precision. */
		cron: string;
		/** IANA timezone used to evaluate the expression. Defaults to UTC. */
		timezone?: string;
	};
};

/** A routine created with `defineRoutine`. It runs unattended and can use every tool on its agent. */
export type RoutineDefinition<Key extends string = string> = {
	readonly type: "routine-definition";
	readonly key: Key;
	readonly name: string;
	readonly instructions: string;
	readonly conversationMode: AgentRoutineConversationMode;
	readonly model?: AiModelSelection;
	readonly tools: Readonly<RoutineTools>;
	readonly schedule: { readonly cron: string; readonly timezone: string };
};

export type DefineAgentOptions<Key extends string> = {
	/** Stable, unique key using lowercase letters, numbers and single hyphens. Changing it detaches saved chats and routines. */
	key: Key;
	/** Set to false to turn the agent off without removing it. Its chats and routines are kept. Defaults to true. */
	enabled?: boolean;
	name: string;
	/** Helps people choose the agent. */
	description: string;
	/** Added to the agent's system prompt. Common indentation is removed. */
	instructions?: string;
	/** The tools the agent can call, such as `agentTools.content()` or your own `defineAgentTool` tools. Bundles are flattened. */
	tools?: readonly (AgentToolDefinition | readonly AgentToolDefinition[])[];
	skills?: readonly SkillDefinition[];
	/** Resource types the chat composer offers to attach. Both are enabled by default. Tools can always link resources. */
	attachments?: { media?: boolean; documents?: boolean };
	/** The default model and the models people can choose. Leave out to offer every model the Lucid service provides. */
	models?: AiModelConfig;
	/** Messages people can select to start a chat. Plain message strings have their common indentation removed. */
	suggestions?: readonly {
		title: AdminCopyInput;
		description: AdminCopyInput;
		message: AdminCopyInput;
	}[];
	/** Scheduled routines that run as the system. People with the agent's manage permission can review them. */
	routines?: readonly RoutineDefinition[];
};

/** An agent created with `defineAgent`. Each agent registers its own use and manage permissions. */
export type AgentDefinition<Key extends string = string> = {
	readonly type: "agent-definition";
	readonly key: Key;
	readonly enabled: boolean;
	readonly name: string;
	readonly description: string;
	readonly instructions: string;
	readonly tools: readonly AgentToolDefinition[];
	readonly skills: readonly SkillDefinition[];
	/** Resource types the chat composer offers to attach. */
	readonly attachments: {
		readonly media: boolean;
		readonly documents: boolean;
	};
	readonly models?: AiModelConfig;
	readonly suggestions: readonly {
		readonly title: ResolvedAdminCopy;
		readonly description: ResolvedAdminCopy;
		readonly message: ResolvedAdminCopy;
	}[];
	readonly routines: readonly RoutineDefinition[];
};
