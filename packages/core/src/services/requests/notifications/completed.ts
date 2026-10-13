import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import getRequestPath from "../helpers/get-request-path.js";
import { requestData } from "./shared.js";

export const completedNotification = defineNotification({
	key: "requests:completed",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.completed.name", {
		defaultMessage: "Request completed",
	}),
	description: copy("admin:core.notifications.requests.completed.description", {
		defaultMessage: "A request you are part of has been completed.",
	}),
	level: "success",
	audience: "recipients",
	defaults: { email: false },
	data: requestData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.completed.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} was completed",
		}),
		href: getRequestPath(data.requestId),
	}),
});
