import formatter, {
	notificationsFormatter,
} from "../../libs/formatters/index.js";
import { NotificationsRepository } from "../../libs/repositories/index.js";
import type { GetMultipleQueryParams } from "../../schemas/notifications.js";
import type { Notification } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAgentActors from "../agent/helpers/get-agent-actors.js";
import getRequestUsers from "../requests/helpers/get-request-users.js";

const getMultiple: ServiceFn<
	[{ userId: number; query: GetMultipleQueryParams }],
	{ data: Notification[]; count: number }
> = async (context, data) => {
	const Notifications = new NotificationsRepository(context.db);

	const notificationsRes = await Notifications.selectMultipleForUser({
		userId: data.userId,
		queryParams: data.query,
		validation: { enabled: true },
	});
	if (notificationsRes.error) return notificationsRes;

	const [notifications, count] = notificationsRes.data;
	const [actorsRes, agentsRes] = await Promise.all([
		getRequestUsers(context, {
			ids: notifications.map((notification) => notification.actor_user_id),
		}),
		getAgentActors(context, {
			runIds: notifications.map((notification) => notification.actor_run_id),
		}),
	]);
	if (actorsRes.error) return actorsRes;
	if (agentsRes.error) return agentsRes;

	return {
		error: undefined,
		data: {
			data: notificationsFormatter.formatMultiple({
				notifications,
				actors: actorsRes.data,
				agents: agentsRes.data,
				config: context.config,
				translate: context.translate,
			}),
			count: formatter.parseCount(count?.count),
		},
	};
};

export default getMultiple;
