import { contextLimits } from "../../../../libs/agent/context.js";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import { AgentMessagesRepository } from "../../../../libs/repositories/index.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/**
 * Reads back saved history, including messages summarised or cut from
 * context. Without a message id it lists positions with short previews; with
 * one it returns that message in bounded character pages.
 */
const history: RunnerToolInputHandler<typeof runnerTools.history> = async (
	context,
	{ input, run },
) => {
	const unavailable = () =>
		toolFailure(context.translate("server:agent.history.unavailable"));

	const Messages = new AgentMessagesRepository(context.db);
	if (input.messageId) {
		const message = await Messages.selectSingle({
			select: ["id", "position", "role", "parts"],
			where: [
				{ key: "id", operator: "=", value: input.messageId },
				{ key: "conversation_id", operator: "=", value: run.conversation_id },
			],
		});
		if (message.error || !message.data) return unavailable();

		const text = JSON.stringify(message.data.parts);
		const end = input.offset + contextLimits.historyPageChars;

		return toolResult({
			summary: copy("admin:core.tools.lucid_read_history.message.summary", {
				data: { position: message.data.position },
			}),
			output: {
				id: message.data.id,
				position: message.data.position,
				role: message.data.role,
				content: text.slice(input.offset, end),
				nextOffset: end < text.length ? end : null,
			},
		});
	}

	const page = await Messages.selectAfter({
		conversationId: run.conversation_id,
		after: input.after,
		limit: contextLimits.historyListSize,
	});
	if (page.error) return unavailable();

	return toolResult({
		summary: copy(
			page.data.length === 1
				? "admin:core.tools.lucid_read_history.summary.one"
				: "admin:core.tools.lucid_read_history.summary",
			{
				data: { count: page.data.length },
			},
		),
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
	});
};

export default history;
