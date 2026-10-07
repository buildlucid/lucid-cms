import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { requestData, requestHref } from "./shared.js";

export const approvedNotification = defineNotification({
	key: "requests:approved",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.approved.name", {
		defaultMessage: "Approval given",
	}),
	description: copy("admin:core.notifications.requests.approved.description", {
		defaultMessage: "A reviewer approves your request.",
	}),
	level: "success",
	audience: "recipients",
	defaults: { email: false },
	data: requestData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.approved.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} was approved",
		}),
		href: requestHref(data.requestId),
	}),
});
