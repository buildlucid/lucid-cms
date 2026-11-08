import constants from "../../constants/constants.js";
import { checkpointSchema } from "../../libs/agent/types.js";
import { agentFormatter } from "../../libs/formatters/index.js";
import {
	AgentConversationsRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { AgentSubagents, AgentWidgetPart } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleConversation from "./helpers/get-accessible-conversation.js";

const confirmationKeys: ReadonlySet<string> = new Set([
	constants.agent.widgets.confirmation,
	constants.agent.widgets.confirmationBatch,
]);

/**
 * Returns the parent and sub-agents, or parent and siblings for a sub-agent chat. Includes pending
 * confirmations for answering from the parent chat.
 */
const getSubagents: ServiceFn<
	[{ id: string; userId: number }],
	AgentSubagents
> = async (context, input) => {
	const conversation = await getAccessibleConversation(context, input);
	if (conversation.error) return conversation;

	const parentId = conversation.data.parent_conversation_id;
	const parent = parentId
		? await getAccessibleConversation(context, {
				id: parentId,
				userId: input.userId,
			})
		: conversation;
	if (parent.error) return parent;

	const Conversations = new AgentConversationsRepository(context.db);
	const Runs = new AgentRunsRepository(context.db);

	const subagents = await Conversations.selectSubagents(parent.data.id);
	if (subagents.error) return subagents;

	const waitingRunIds = subagents.data.flatMap((subagent) =>
		subagent.latest_run_id &&
		subagent.latest_run_status === "waiting" &&
		subagent.latest_run_waiting_for === "person"
			? [subagent.latest_run_id]
			: [],
	);
	const waiting = waitingRunIds.length
		? await Runs.selectMultiple({
				select: ["id", "checkpoint"],
				where: [{ key: "id", operator: "in", value: waitingRunIds }],
			})
		: { error: undefined, data: [] };
	if (waiting.error) return waiting;

	const pending = new Map<string, AgentWidgetPart>();
	for (const run of waiting.data ?? []) {
		const widget = checkpointSchema.safeParse(run.checkpoint).data?.pending
			?.widget;
		if (widget && confirmationKeys.has(widget.key)) pending.set(run.id, widget);
	}

	return {
		error: undefined,
		data: {
			parent: agentFormatter.formatConversation({ conversation: parent.data }),
			subagents: subagents.data.map((subagent) => ({
				...agentFormatter.formatConversation({ conversation: subagent }),
				pending:
					(subagent.latest_run_id && pending.get(subagent.latest_run_id)) ||
					null,
			})),
		},
	};
};

export default getSubagents;
