import { getAgent } from "../../../libs/agent/registry.js";
import aiUsageFormatter, {
	type AiUsageSessionPropT,
} from "../../../libs/formatters/ai-usage.js";
import {
	getConversationLevel,
	hasAgentPermission,
} from "../../../libs/permission/agent-permissions.js";
import formatUserRefs from "../../../libs/refs/users/format.js";
import {
	AgentConversationsRepository,
	UsersRepository,
} from "../../../libs/repositories/index.js";
import type { AiUsageSession } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUserAccess from "../../users/resolve-access.js";

/**
 * Formats sessions with their users. An agent session links its chat only
 * when the viewer could open that chat, so other people's titles stay private.
 */
const hydrateUsageSessions: ServiceFn<
	[{ sessions: AiUsageSessionPropT[]; viewerId: number }],
	AiUsageSession[]
> = async (context, input) => {
	const userIds = Array.from(
		new Set(
			input.sessions.flatMap((session) =>
				session.user_id === null ? [] : [session.user_id],
			),
		),
	);
	const conversationIds = input.sessions.flatMap((session) =>
		session.session_type === "agent" ? [session.session_id] : [],
	);

	const Users = new UsersRepository(context.db);
	const AgentConversations = new AgentConversationsRepository(context.db);

	const [users, conversations, viewer] = await Promise.all([
		userIds.length
			? Users.selectMultipleByIds({
					ids: userIds,
					validation: { enabled: true },
				})
			: { error: undefined, data: [] },
		conversationIds.length
			? AgentConversations.selectMultiple({
					select: ["id", "title", "user_id", "agent_key"],
					where: [{ key: "id", operator: "in", value: conversationIds }],
					validation: { enabled: true },
				})
			: { error: undefined, data: [] },
		resolveUserAccess(context, { userId: input.viewerId }),
	]);
	if (users.error) return users;
	if (conversations.error) return conversations;
	if (viewer.error) return viewer;

	const userRefs = new Map(
		formatUserRefs(users.data, {
			host: getBaseUrl(context),
			mediaDelivery: context.mediaDelivery,
			defaultLocale: context.config.localization.defaultLocale,
			locales: context.config.localization.locales,
		}).map((user) => [user.id, user]),
	);
	const openable = new Map(
		conversations.data
			.filter(
				(conversation) =>
					getAgent(context.config, conversation.agent_key) !== undefined &&
					(conversation.user_id === null ||
						conversation.user_id === input.viewerId) &&
					hasAgentPermission(
						viewer.data,
						conversation.agent_key,
						getConversationLevel(conversation.user_id),
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
						: (userRefs.get(session.user_id) ?? null),
				conversation:
					session.session_type === "agent"
						? (openable.get(session.session_id) ?? null)
						: null,
			}),
		),
	};
};

export default hydrateUsageSessions;
