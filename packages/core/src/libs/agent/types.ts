import z from "zod";
import {
	type agentContextSchema,
	agentMessagePartSchema,
	agentRunOutcomeSchema,
} from "../../schemas/agent.js";
import { cmsAiUsageSchema } from "../lucid-remote/schema/ai.js";
import type { SkillDefinition } from "../skills/types.js";
import type { AgentToolDefinition } from "../tools/types.js";

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
	}),
	z.object({ type: z.literal("text-delta"), text: z.string() }),
	toolCallSchema.extend({ type: z.literal("tool-call") }),
	z.object({
		type: z.literal("finish"),
		requestId: z.string(),
		usage: cmsAiUsageSchema,
	}),
	z.object({ type: z.literal("error"), message: z.string() }),
]);

/** Everything needed to resume a run exactly where it stopped. */
export const checkpointSchema = z.object({
	version: z.literal(1),
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
		.object({ id: z.string(), tokenLimit: z.number().int().positive() })
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
	turns: z.number().int().nonnegative(),
	nudges: z.number().int().nonnegative(),
	requestId: z.uuid(),
	messageId: z.uuid(),
	parts: z.array(agentMessagePartSchema),
	calls: z.array(toolCallSchema),
	cursor: z.number().int().nonnegative(),
	phase: z.enum(["model", "tools"]),
	pending: z
		.object({
			id: z.string(),
			kind: z.enum(["question", "approval"]),
			question: z.string(),
			options: z.array(z.string()).optional(),
			answer: z.string().optional(),
			/** An approved write runs with this person's permissions. */
			answeredBy: z.number().int().optional(),
		})
		.optional(),
	inFlightWrite: z.string().optional(),
	finish: z
		.object({ outcome: agentRunOutcomeSchema, summary: z.string() })
		.optional(),
});

export type ToolCall = z.infer<typeof toolCallSchema>;
export type ModelMessage = z.infer<typeof modelMessageSchema>;
export type ModelEvent = z.infer<typeof modelEventSchema>;
export type ModelUsage = Extract<ModelEvent, { type: "finish" }>["usage"];
export type Checkpoint = z.infer<typeof checkpointSchema>;
export type ConversationContext = z.infer<typeof agentContextSchema>;
/** Chat runs answer a person; routine runs work unattended until they finish. */
export type RunMode = "chat" | "routine";

export type DefineRoutineOptions<Key extends string> = {
	/** Stable key, unique within the agent, using lowercase letters, numbers and single hyphens. */
	key: Key;
	name: string;
	/** What each run should do. Common indentation is removed, so template literals can be indented. */
	instructions: string;
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
	readonly schedule: { readonly cron: string; readonly timezone: string };
};

export type DefineAgentOptions<Key extends string> = {
	/** Stable, unique key using lowercase letters, numbers and single hyphens. Changing it detaches saved chats and routines. */
	key: Key;
	name: string;
	/** Helps people choose the agent. */
	description: string;
	/** Added to the agent's system prompt. Common indentation is removed. */
	instructions?: string;
	/** Additional tools the agent can call. Lucid's content tools are always available. */
	tools?: readonly AgentToolDefinition[];
	skills?: readonly SkillDefinition[];
	/** Scheduled routines that run as the system. People with the agent's manage permission can review them. */
	routines?: readonly RoutineDefinition[];
};

/** An agent created with `defineAgent`. Each agent registers its own use and manage permissions. */
export type AgentDefinition<Key extends string = string> = {
	readonly type: "agent-definition";
	readonly key: Key;
	readonly name: string;
	readonly description: string;
	readonly instructions: string;
	readonly tools: readonly AgentToolDefinition[];
	readonly skills: readonly SkillDefinition[];
	readonly routines: readonly RoutineDefinition[];
};
