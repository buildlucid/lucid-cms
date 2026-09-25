import z from "zod";
import {
	agentMessagePartSchema,
	agentRunOutcomeSchema,
} from "../../schemas/agent.js";
import { cmsAiUsageSchema } from "../lucid-remote/schema/ai.js";

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
	messages: z.array(modelMessageSchema),
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
/** Chat runs answer a person; routine runs work unattended until they finish. */
export type RunMode = "chat" | "routine";
