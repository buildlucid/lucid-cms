import { agentFormatter } from "../../libs/formatters/index.js";
import {
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { AgentMessage, AgentRunResultPart } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";

/** Returns a page of messages in display order, ending before the given position. */
const getMessages: ServiceFn<
	[{ conversationId: string; userId: number; before?: number; limit: number }],
	AgentMessage[]
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, {
		id: input.conversationId,
		userId: input.userId,
	});
	if (conversation.error) return conversation;

	const AgentMessages = new AgentMessagesRepository(context.db);

	const messages = await AgentMessages.selectLatest(input);
	if (messages.error) return messages;

	const runIds = messages.data.flatMap((message) =>
		message.parts.some((part) => part.type === "routine") ? [message.id] : [],
	);
	const results = new Map<string, AgentRunResultPart>();
	if (runIds.length) {
		const AgentRuns = new AgentRunsRepository(context.db);
		const runs = await AgentRuns.selectResults(runIds);
		if (runs.error) return runs;

		for (const run of runs.data) {
			const result = agentFormatter.formatRunResult({ run });
			if (result) results.set(run.id, result);
		}
	}

	return {
		error: undefined,
		data: messages.data.reverse().map((message) =>
			agentFormatter.formatMessage({
				message,
				result: results.get(message.id),
			}),
		),
	};
};

export default getMessages;
