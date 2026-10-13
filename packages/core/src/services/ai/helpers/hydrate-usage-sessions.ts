import { getAgent } from "../../../libs/agent/registry.js";
import aiUsageFormatter, {
	type AiUsageSessionPropT,
} from "../../../libs/formatters/ai-usage.js";
import {
	getConversationPermission,
	hasAgentPermission,
} from "../../../libs/permission/agent-permissions.js";
import { AgentConversationsRepository } from "../../../libs/repositories/index.js";
import type { AiUsageSession } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getDisplayUsers from "../../users/helpers/get-display-users.js";
import resolveUserAccess from "../../users/resolve-access.js";

/** Formats usage sessions with users, exposing chat titles and links only when a viewer is present and can open the chat. */
const hydrateUsageSessions: ServiceFn<
	[{ sessions: AiUsageSessionPropT[]; viewerId: number | null }],
	AiUsageSession[]
> = async (context, input) => {
	const conversationIds = input.sessions.flatMap((session) =>
		session.session_type === "agent" ? [session.session_id] : [],
	);

	const AgentConversations = new AgentConversationsRepository(context.db);

	const [users, conversations, viewer] = await Promise.all([
		getDisplayUsers(context, {
			ids: input.sessions.map((session) => session.user_id),
		}),
		conversationIds.length
			? AgentConversations.selectMultiple({
					select: ["id", "title", "user_id", "agent_key", "kind"],
					where: [{ key: "id", operator: "in", value: conversationIds }],
					validation: { enabled: true },
				})
			: { error: undefined, data: [] },
		input.viewerId === null
			? { error: undefined, data: null }
			: resolveUserAccess(context, { userId: input.viewerId }),
	]);
	if (users.error) return users;
	if (conversations.error) return conversations;
	if (viewer.error) return viewer;

	const openable = new Map(
		conversations.data
			.filter(
				(conversation) =>
					viewer.data !== null &&
					getAgent(context.config, conversation.agent_key) !== undefined &&
					(conversation.user_id === null ||
						conversation.user_id === input.viewerId) &&
					hasAgentPermission(
						viewer.data,
						conversation.agent_key,
						getConversationPermission(conversation.kind),
					),
			)
			.map((conversation) => [
				conversation.id,
				{ id: conversation.id, title: conversation.title },
			]),
	);

	return {
		error: undefined,
		data: input.sessions.map((session) =>
			aiUsageFormatter.formatSession({
				session,
				user:
					session.user_id === null
						? null
						: (users.data.get(session.user_id) ?? null),
				conversation:
					session.session_type === "agent"
						? (openable.get(session.session_id) ?? null)
						: null,
			}),
		),
	};
};

export default hydrateUsageSessions;
