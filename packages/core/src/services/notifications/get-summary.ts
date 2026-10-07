import formatter from "../../libs/formatters/index.js";
import { NotificationsRepository } from "../../libs/repositories/index.js";
import type { NotificationSummary } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getSummary: ServiceFn<[{ userId: number }], NotificationSummary> = async (
	context,
	data,
) => {
	const Notifications = new NotificationsRepository(context.db);

	const summaryRes = await Notifications.selectSummaryForUser({
		userId: data.userId,
	});
	if (summaryRes.error) return summaryRes;

	return {
		error: undefined,
		data: {
			unread: formatter.parseCount(summaryRes.data?.unread ?? 0),
			actionRequired: formatter.parseCount(
				summaryRes.data?.action_required ?? 0,
			),
			latestUpdatedAt: formatter.formatDate(summaryRes.data?.latest_updated_at),
		},
	};
};

export default getSummary;
