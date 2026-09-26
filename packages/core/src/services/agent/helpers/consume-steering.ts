import type { Checkpoint } from "../../../libs/agent/types.js";
import { agentFormatter } from "../../../libs/formatters/index.js";
import {
	AgentInputsRepository,
	AgentMessagesRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getInputsEvent from "../get-inputs-event.js";
import type { RunSession } from "./run-session.js";
import startNextTurn from "./start-next-turn.js";

/**
 * Delivers steers claimed by this run: the rest of the current plan is skipped,
 * and the new instructions are checkpointed before they are acknowledged, so a
 * crash never loses or repeats them. Returns true when the run was redirected.
 */
const consumeSteering: ServiceFn<
	[{ checkpoint: Checkpoint; session: RunSession }],
	boolean
> = async (context, { checkpoint, session }) => {
	if (
		checkpoint.purpose ||
		checkpoint.compaction ||
		checkpoint.historyAfter !== undefined
	) {
		return { error: undefined, data: false };
	}

	const claimed = await session.claimSteering();
	if (claimed.error) return claimed;
	if (!claimed.data.length) return { error: undefined, data: false };

	const inputs = new AgentInputsRepository(context.db);
	const messages = new AgentMessagesRepository(context.db);

	const fresh = claimed.data.filter(
		(input) => !checkpoint.inputIds?.includes(input.id),
	);
	if (fresh.length) {
		const output = {
			skipped: true,
			reason: "The user redirected this run before the tool started.",
		};

		for (const call of checkpoint.calls.slice(checkpoint.cursor)) {
			checkpoint.messages.push({
				sourceId: checkpoint.messageId,
				role: "tool",
				toolCallId: call.id,
				name: call.name,
				output,
			});

			for (const part of checkpoint.parts) {
				if (part.type === "tool" && part.id === call.id) {
					part.status = "skipped";
					part.output = output;
				}
				if (part.type === "question" && part.id === call.id) {
					part.dismissed = true;
				}
			}

			await session.emit({
				type: "tool",
				messageId: checkpoint.messageId,
				...call,
				status: "skipped",
				output,
			});
		}

		checkpoint.pending = undefined;
		checkpoint.finish = undefined;

		// Save the old assistant message before appending user messages or rotating its ID.
		const saved = await session.saveReply();
		if (saved.error) return saved;

		for (const input of fresh) {
			const appended = await session.appendInput({
				id: input.id,
				text: input.text,
				createdAt: new Date(input.created_at).toISOString(),
			});
			if (appended.error) return appended;

			if (
				!checkpoint.messages.some((message) => message.sourceId === input.id)
			) {
				checkpoint.messages.push({
					sourceId: input.id,
					role: "user",
					content: input.text,
				});
			}
		}

		checkpoint.inputIds = [
			...(checkpoint.inputIds ?? []),
			...fresh.map((input) => input.id),
		];
		startNextTurn(checkpoint);

		const persisted = await session.save();
		if (persisted.error) return persisted;
	}

	const acknowledged = await inputs.acknowledge(
		claimed.data.map((input) => input.id),
	);
	if (acknowledged.error) return acknowledged;

	//* the chat shows steered messages in the transcript and drops them from its queue
	const stored = await messages.selectMultiple({
		select: [
			"id",
			"conversation_id",
			"run_id",
			"role",
			"parts",
			"position",
			"created_at",
			"updated_at",
		],
		where: [
			{
				key: "id",
				operator: "in",
				value: claimed.data.map((input) => input.id),
			},
		],
		orderBy: [{ column: "position", direction: "asc" }],
	});
	if (stored.error) return stored;

	for (const message of stored.data ?? []) {
		await session.emit({
			type: "message",
			message: agentFormatter.formatMessage({ message }),
		});
	}

	const queue = await getInputsEvent(context, {
		conversationId: claimed.data[0]?.conversation_id ?? "",
	});
	if (queue.error) return queue;

	await session.emit(queue.data);

	return { error: undefined, data: fresh.length > 0 };
};
export default consumeSteering;
