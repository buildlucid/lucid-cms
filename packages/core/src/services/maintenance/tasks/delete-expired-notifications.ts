import { NotificationsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Removes notifications older than the retention window, keeping open to-dos. */
const deleteExpiredNotifications: ServiceFn<[], undefined> = async (
	context,
) => {
	const Notifications = new NotificationsRepository(context.db);

	const deleteRes = await Notifications.deleteExpired({
		before: new Date(
			Date.now() - context.config.retention.notifications * 24 * 60 * 60 * 1000,
		).toISOString(),
	});
	if (deleteRes.error) return deleteRes;

	return { error: undefined, data: undefined };
};

export default deleteExpiredNotifications;
