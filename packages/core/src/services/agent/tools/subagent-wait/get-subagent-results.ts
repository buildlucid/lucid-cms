import type z from "zod";
import constants from "../../../../constants/constants.js";
import { textFromParts } from "../../../../libs/agent/input.js";
import { isTerminalRunStatus } from "../../../../libs/agent/run-status.js";
import {
	AgentConversationsRepository,
	AgentMessagesRepository,
} from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { subagentReadToolName } from "../subagent-read/constants.js";
import type { outputSchema } from "./schema.js";

/**
 * Reads a chat's sub-agents with their latest run and, once it has finished, its last reply.
 * @remarks Long replies are cut to `constants.agent.subagents.replyChars`; the rest is read with the sub-agent read tool.
 */
const getSubagentResults: ServiceFn<
	[{ parentConversationId: string; conversationIds?: readonly string[] }],
	z.output<typeof outputSchema>["results"]
> = async (context, input) => {
	const Conversations = new AgentConversationsRepository(context.db);
	const Messages = new AgentMessagesRepository(context.db);

	const subagents = await Conversations.selectSubagents(
		input.parentConversationId,
	);
	if (subagents.error) return subagents;

	const selected = subagents.data.filter(
		(subagent) =>
			!input.conversationIds || input.conversationIds.includes(subagent.id),
	);
	const finishedRunIds = selected.flatMap((subagent) =>
		subagent.latest_run_id &&
		subagent.latest_run_status &&
		isTerminalRunStatus(subagent.latest_run_status)
			? [subagent.latest_run_id]
			: [],
	);

	const replies = finishedRunIds.length
		? await Messages.selectMultiple({
				select: ["run_id", "parts", "position"],
				where: [
					{ key: "run_id", operator: "in", value: finishedRunIds },
					{ key: "role", operator: "=", value: "assistant" },
				],
				orderBy: [{ column: "position", direction: "asc" }],
				validation: { enabled: true },
			})
		: { error: undefined, data: [] };
	if (replies.error) return replies;

	//* each model turn is its own message, so the reply is the last one with text
	const lastReply = new Map<string, string>();
	for (const message of replies.data) {
		const text = textFromParts(message.parts).trim();
		if (message.run_id && text) lastReply.set(message.run_id, text);
	}

	const { replyChars } = constants.agent.subagents;

	return {
		error: undefined,
		data: selected.flatMap((subagent) => {
			if (!subagent.latest_run_id || !subagent.latest_run_status) return [];

			const reply = lastReply.get(subagent.latest_run_id) ?? null;
			return [
				{
					subagentId: subagent.id,
					agentKey: subagent.agent_key,
					title: subagent.title,
					status: subagent.latest_run_status,
					reply:
						reply && reply.length > replyChars
							? `${reply.slice(0, replyChars)}\n\n[Reply shortened. Read the rest with ${subagentReadToolName}.]`
							: reply,
					errorMessage: subagent.latest_run_error ?? null,
				},
			];
		}),
	};
};

export default getSubagentResults;
