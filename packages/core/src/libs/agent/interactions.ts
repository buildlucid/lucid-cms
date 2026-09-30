import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import z from "zod";
import constants from "../../constants/constants.js";
import type { AgentInteraction } from "../../types/response.js";
import type { AgentToolDefinition } from "../tools/types.js";
import type { Checkpoint, ToolCall } from "./types.js";

export type PendingInteraction = NonNullable<Checkpoint["pending"]>;
export type InteractionAnswer = NonNullable<PendingInteraction["answer"]>;

export const questionResponseSchema = z.object({
	answer: z.string().trim().min(1).max(20_000),
});

export const approvalBatchResponseSchema = z.object({
	approvedToolCallIds: z.array(z.string()).max(constants.agent.readConcurrency),
});

/**
 * Whether the run's approval policy asks before an agent tool runs. Tool
 * defaults use each tool's own setting, which a routine can override.
 */
export const needsApproval = (
	checkpoint: Checkpoint,
	tool: AgentToolDefinition,
) => {
	switch (checkpoint.approvalMode) {
		case "confirm-all":
			return true;
		case "tool-defaults":
			return (
				checkpoint.routineTools?.[tool.name]?.requiresApproval ??
				tool.requiresApproval
			);
		case "automatic":
			return false;
	}
};

/** A grouped decision applies only to the saved call and exact validated input. */
export const toolInteractionAnswer = (
	checkpoint: Checkpoint,
	call: ToolCall,
): InteractionAnswer | undefined => {
	const pending = checkpoint.pending;
	if (!pending?.answer) return undefined;

	const approvals = pending.widget.interaction.approvals;
	if (!approvals) {
		return pending.widget.interaction.toolCallId === call.id
			? pending.answer
			: undefined;
	}

	const covered = approvals.some(
		(approval) =>
			approval.toolCallId === call.id &&
			approval.toolName === call.name &&
			isDeepStrictEqual(approval.input, call.input),
	);
	if (!covered) return undefined;
	if (pending.answer.action === "cancel") return pending.answer;

	//* calls left out of the approved list were denied
	const response = approvalBatchResponseSchema.safeParse(
		pending.answer.response,
	);
	return response.success && response.data.approvedToolCallIds.includes(call.id)
		? { action: "submit", response: {} }
		: { action: "cancel" };
};

export const createInteraction = (props: {
	callId: string;
	approval?: AgentInteraction["approval"];
	approvals?: AgentInteraction["approvals"];
	key: string;
	version?: number;
	title: string;
	placement?: AgentInteraction["placement"];
	data: Record<string, unknown>;
}): PendingInteraction => ({
	widget: {
		type: "widget",
		key: props.key,
		version: props.version ?? 1,
		data: props.data,
		interaction: {
			id: randomUUID(),
			toolCallId: props.callId,
			approval: props.approval,
			approvals: props.approvals,
			title: props.title,
			placement: props.placement ?? "composer",
			status: "pending",
		},
	},
});

export const answerInteraction = (
	checkpoint: Checkpoint,
	answer: InteractionAnswer,
	userId: number,
) => {
	if (!checkpoint.pending) return;
	const { widget } = checkpoint.pending;
	checkpoint.pending.answer = answer;
	widget.interaction.answeredByUserId = userId;
	widget.interaction =
		answer.action === "cancel"
			? { ...widget.interaction, status: "cancelled" }
			: {
					...widget.interaction,
					status: "answered",
					response: answer.response,
				};
	checkpoint.parts = checkpoint.parts.map((part) =>
		part.type === "widget" && part.interaction?.id === widget.interaction.id
			? widget
			: part,
	);
};
