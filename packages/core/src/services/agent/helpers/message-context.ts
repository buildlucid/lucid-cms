import type { StoredAgentMessagePart } from "../../../libs/agent/messages.js";
import { UsersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Stores message timing and acting-user context for the model and conversation history.
 * @remarks Omitted or null timezones default to UTC.
 */
const messageContext: ServiceFn<
	[{ userId: number | null; timezone?: string | null; sentAt: string }],
	Extract<StoredAgentMessagePart, { type: "context" }>
> = async (context, input) => {
	const base = {
		type: "context" as const,
		sentAt: input.sentAt,
		timezone: input.timezone ?? "UTC",
	};
	if (input.userId === null) {
		return { error: undefined, data: { ...base, actingFor: null } };
	}

	const Users = new UsersRepository(context.db);

	const user = await Users.selectSingle({
		select: ["first_name", "last_name", "username"],
		where: [{ key: "id", operator: "=", value: input.userId }],
	});
	if (user.error) return user;

	const name =
		[user.data?.first_name, user.data?.last_name].filter(Boolean).join(" ") ||
		user.data?.username ||
		`User ${input.userId}`;

	return {
		error: undefined,
		data: { ...base, actingFor: { userId: input.userId, name } },
	};
};

export default messageContext;
