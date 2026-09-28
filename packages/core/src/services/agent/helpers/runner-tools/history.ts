import { contextLimits } from "../../../../libs/agent/context.js";
import runnerTools from "../../../../libs/agent/runner-tools.js";
import { AgentMessagesRepository } from "../../../../libs/repositories/index.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolHandler } from "./types.js";

/**
 * Reads back saved history, including messages summarised or cut from
 * context. Without a message id it lists positions with short previews; with
 * one it returns that message in bounded character pages.
 */
const history: RunnerToolHandler = async (context, { call, run }) => {
	const input = runnerTools.history.input.safeParse(call.input);
	if (!input.success) {
		return toolFailure(context.translate("server:agent.history.invalid"));
	}

	const unavailable = () =>
		toolFailure(context.translate("server:agent.history.unavailable"));

	const Messages = new AgentMessagesRepository(context.db);
	if (input.data.messageId) {
		const message = await Messages.selectSingle({
			select: ["id", "position", "role", "parts"],
			where: [
				{ key: "id", operator: "=", value: input.data.messageId },
				{ key: "conversation_id", operator: "=", value: run.conversation_id },
			],
		});
		if (message.error || !message.data) return unavailable();

		const text = JSON.stringify(message.data.parts);
		const end = input.data.offset + contextLimits.historyPageChars;

		return {
			kind: "result",
			failed: false,
			output: {
				id: message.data.id,
				position: message.data.position,
				role: message.data.role,
				content: text.slice(input.data.offset, end),
				nextOffset: end < text.length ? end : null,
			},
		};
	}

	const page = await Messages.selectAfter({
		conversationId: run.conversation_id,
		after: input.data.after,
		limit: contextLimits.historyListSize,
	});
	if (page.error) return unavailable();

	return {
		kind: "result",
		failed: false,
		output: {
			messages: page.data.map((message) => ({
				id: message.id,
				position: message.position,
				role: message.role,
				preview: JSON.stringify(message.parts).slice(
					0,
					contextLimits.historyPreviewChars,
				),
			})),
			nextAfter:
				page.data.length === contextLimits.historyListSize
					? page.data.at(-1)?.position
					: null,
		},
	};
};

export default history;
