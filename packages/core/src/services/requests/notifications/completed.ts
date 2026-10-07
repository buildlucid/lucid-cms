import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { requestData, requestHref } from "./shared.js";

export const completedNotification = defineNotification({
	key: "requests:completed",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.completed.name", {
		defaultMessage: "Request published",
	}),
	description: copy("admin:core.notifications.requests.completed.description", {
		defaultMessage: "A request you are part of has been published.",
	}),
	level: "success",
	audience: "recipients",
	defaults: { email: false },
	data: requestData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.completed.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} was published",
		}),
		href: requestHref(data.requestId),
	}),
});
