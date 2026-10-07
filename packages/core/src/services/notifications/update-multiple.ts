import { NotificationRecipientsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/**
 * Marks the person's notifications read, unread, archived or unarchived.
 * `all` covers their whole inbox, or everything archived when unarchiving.
 */
const updateMultiple: ServiceFn<
	[
		{
			userId: number;
			ids?: number[];
			all?: boolean;
			read?: boolean;
			archived?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	if (!data.all && (data.ids === undefined || data.ids.length === 0)) {
		return { error: undefined, data: undefined };
	}
	if (data.read === undefined && data.archived === undefined) {
		return { error: undefined, data: undefined };
	}

	const Recipients = new NotificationRecipientsRepository(context.db);

	const now = new Date().toISOString();
	const updateRes = await Recipients.updateMultiple({
		data: {
			...(data.read !== undefined ? { read_at: data.read ? now : null } : {}),
			...(data.archived !== undefined
				? { archived_at: data.archived ? now : null }
				: {}),
		},
		where: [
			{ key: "user_id", operator: "=", value: data.userId },
			{
				key: "notification_id",
				operator: "in",
				value: data.ids ?? [],
				condition: !data.all,
			},
			{
				key: "archived_at",
				operator: data.archived === false ? "is not" : "is",
				value: null,
				condition: data.all === true,
			},
		],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default updateMultiple;
