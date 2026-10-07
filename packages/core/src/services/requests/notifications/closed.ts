import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { requestData, requestHref } from "./shared.js";

export const closedNotification = defineNotification({
	key: "requests:closed",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.closed.name", {
		defaultMessage: "Request closed",
	}),
	description: copy("admin:core.notifications.requests.closed.description", {
		defaultMessage: "A request you are part of is closed or reopened.",
	}),
	audience: "recipients",
	defaults: { email: false },
	data: requestData.extend({ reopened: z.boolean() }),
	render: ({ data }) => ({
		title: data.reopened
			? copy("server:core.notifications.requests.reopened.title", {
					data: { title: data.title },
					defaultMessage: "{{title}} was reopened",
				})
			: copy("server:core.notifications.requests.closed.title", {
					data: { title: data.title },
					defaultMessage: "{{title}} was closed",
				}),
		href: requestHref(data.requestId),
	}),
});
