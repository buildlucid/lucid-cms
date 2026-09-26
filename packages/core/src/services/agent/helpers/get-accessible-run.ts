import { copy } from "../../../libs/i18n/index.js";
import { AgentRunsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAccessibleConversation from "./get-accessible-conversation.js";

/** A run is accessible to anyone who can access its conversation. */
const getAccessibleRun: ServiceFn<
	[{ runId: string; userId: number }],
	{ id: string; conversationId: string }
> = async (context, input) => {
	const AgentRuns = new AgentRunsRepository(context.db);

	const result = await AgentRuns.selectSingle({
		select: ["id", "conversation_id"],
		where: [{ key: "id", operator: "=", value: input.runId }],
	});
	if (result.error) return result;
	if (!result.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.run.not.found"),
			},
		};
	}

	const conversation = await getAccessibleConversation(context, {
		id: result.data.conversation_id,
		userId: input.userId,
	});
	if (conversation.error) return conversation;

	return {
		error: undefined,
		data: { id: result.data.id, conversationId: result.data.conversation_id },
	};
};

export default getAccessibleRun;
