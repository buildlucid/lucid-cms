import formatter, { agentFormatter } from "../../libs/formatters/index.js";
import { AgentConversationsRepository } from "../../libs/repositories/index.js";
import type { GetMultipleConversationsQueryParams } from "../../schemas/agent.js";
import type { AgentConversation } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveAgentAccess from "./helpers/resolve-agent-access.js";

const getConversations: ServiceFn<
	[{ userId: number; query: GetMultipleConversationsQueryParams }],
	{ data: AgentConversation[]; count: number }
> = async (context, input) => {
	const access = await resolveAgentAccess(context, { userId: input.userId });
	if (access.error) return access;

	const AgentConversations = new AgentConversationsRepository(context.db);

	const conversations =
		await AgentConversations.selectMultipleFilteredForAccess({
			userId: input.userId,
			agentKeys: access.data,
			queryParams: input.query,
		});
	if (conversations.error) return conversations;

	return {
		error: undefined,
		data: {
			data: conversations.data[0].map((conversation) =>
				agentFormatter.formatConversation({ conversation }),
			),
			count: formatter.parseCount(conversations.data[1]?.count),
		},
	};
};

export default getConversations;
