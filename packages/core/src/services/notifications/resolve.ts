import type { AnyNotificationDefinition } from "../../libs/notifications/types.js";
import { NotificationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Marks the open notification with this type and key as dealt with. It leaves to-do lists but stays in history. */
const resolve: ServiceFn<
	[{ definition: AnyNotificationDefinition; key: string }],
	undefined
> = async (context, data) => {
	const Notifications = new NotificationsRepository(context.db);

	const now = new Date().toISOString();
	const updateRes = await Notifications.updateMultiple({
		data: { resolved_at: now, updated_at: now },
		where: [
			{ key: "type", operator: "=", value: data.definition.key },
			{ key: "key", operator: "=", value: data.key },
			{ key: "resolved_at", operator: "is", value: null },
		],
	});
	if (updateRes.error) return updateRes;

	return { error: undefined, data: undefined };
};

export default resolve;
