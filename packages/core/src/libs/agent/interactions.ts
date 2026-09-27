import { randomUUID } from "node:crypto";
import z from "zod";
import type { AgentInteraction } from "../../types/response.js";
import type { Checkpoint } from "./types.js";

export type PendingInteraction = NonNullable<Checkpoint["pending"]>;
export type InteractionAnswer = NonNullable<PendingInteraction["answer"]>;

export const questionResponseSchema = z.object({
	answer: z.string().trim().min(1).max(20_000),
});

export const createInteraction = (props: {
	callId: string;
	approval?: AgentInteraction["approval"];
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
			title: props.title,
			placement: props.placement ?? "composer",
			status: "pending",
		},
	},
});

export const answerInteraction = (
	checkpoint: Checkpoint,
	answer: InteractionAnswer,
) => {
	if (!checkpoint.pending) return;
	const { widget } = checkpoint.pending;
	checkpoint.pending.answer = answer;
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
