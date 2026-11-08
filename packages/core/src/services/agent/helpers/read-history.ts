import { contextLimits } from "../../../libs/agent/context.js";
import { copy } from "../../../libs/i18n/index.js";
import { AgentMessagesRepository } from "../../../libs/repositories/index.js";
import type { AgentToolResult } from "../../../libs/tools/types.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Reads back a chat's saved messages. Without a message ID it lists positions with short
 * previews; with one it returns that message in bounded character pages.
 */
const readHistory: ServiceFn<
	[
		{
			conversationId: string;
			messageId?: string;
			after: number;
			offset: number;
		},
	],
	AgentToolResult<Record<string, unknown>>
> = async (context, input) => {
	const Messages = new AgentMessagesRepository(context.db);

	if (input.messageId) {
		const message = await Messages.selectSingle({
			select: ["id", "position", "role", "parts"],
			where: [
				{ key: "id", operator: "=", value: input.messageId },
				{ key: "conversation_id", operator: "=", value: input.conversationId },
			],
		});
		if (message.error) return message;
		if (!message.data) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 404,
					message: copy("server:agent.history.unavailable"),
				},
			};
		}

		const text = JSON.stringify(message.data.parts);
		const end = input.offset + contextLimits.historyPageChars;

		return {
			error: undefined,
			data: {
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
			},
		};
	}

	const page = await Messages.selectAfter({
		conversationId: input.conversationId,
		after: input.after,
		limit: contextLimits.historyListSize,
	});
	if (page.error) return page;

	return {
		error: undefined,
		data: {
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
		},
	};
};

export default readHistory;
