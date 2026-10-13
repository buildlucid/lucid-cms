import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import z from "zod";
import constants from "../../constants/constants.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { AgentInteraction } from "../../types/response.js";
import type { ResolvedAdminCopy } from "../i18n/types.js";
import { toolDefinitionInternal } from "../tools/tool-definition-internal.js";
import type { AgentToolDefinition } from "../tools/types.js";
import type { Checkpoint, ToolCall } from "./types.js";

export type PendingInteraction = NonNullable<Checkpoint["pending"]>;
export type InteractionAnswer = NonNullable<PendingInteraction["answer"]>;

export const questionResponseSchema = z.object({
	answer: z.string().trim().min(1).max(20_000),
});

export const confirmationBatchResponseSchema = z.object({
	confirmedToolCallIds: z
		.array(z.string())
		.max(constants.agent.readConcurrency),
});

/**
 * Resolves per-call confirmation under the run policy.
 * @remarks Routine overrides apply only in tool-defaults mode.
 */
export const needsConfirmation = (props: {
	checkpoint: Pick<Checkpoint, "confirmationMode" | "routineTools">;
	tool: AgentToolDefinition;
	input: Record<string, unknown>;
	config: ResolvedLucidConfig;
}) => {
	const { checkpoint, tool } = props;
	switch (checkpoint.confirmationMode) {
		case "confirm-all":
			return true;
		case "tool-defaults":
			return (
				checkpoint.routineTools?.[tool.name]?.requiresConfirmation ??
				tool[toolDefinitionInternal].requiresConfirmation(props)
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

	const confirmations = pending.widget.interaction.confirmations;
	if (!confirmations) {
		return pending.widget.interaction.toolCallId === call.id
			? pending.answer
			: undefined;
	}

	const covered = confirmations.some(
		(confirmation) =>
			confirmation.toolCallId === call.id &&
			confirmation.toolName === call.name &&
			isDeepStrictEqual(confirmation.input, call.input),
	);
	if (!covered) return undefined;
	if (pending.answer.action === "cancel") return pending.answer;

	//* calls left out of the confirmed list were denied
	const response = confirmationBatchResponseSchema.safeParse(
		pending.answer.response,
	);
	return response.success &&
		response.data.confirmedToolCallIds.includes(call.id)
		? { action: "submit", response: {} }
		: { action: "cancel" };
};

export const createInteraction = (props: {
	callId: string;
	confirmation?: AgentInteraction["confirmation"];
	confirmations?: AgentInteraction["confirmations"];
	key: string;
	version?: number;
	title: ResolvedAdminCopy;
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
			confirmation: props.confirmation,
			confirmations: props.confirmations,
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
					//* a screen's answer carries unsaved content, which only the waiting tool reads
					response:
						widget.key === constants.agent.widgets.screen
							? {}
							: answer.response,
				};
	checkpoint.parts = checkpoint.parts.map((part) =>
		part.type === "widget" && part.interaction?.id === widget.interaction.id
			? widget
			: part,
	);
};
