import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { requestData, requestHref } from "./shared.js";

export const readyNotification = defineNotification({
	key: "requests:ready",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.ready.name", {
		defaultMessage: "Ready to complete",
	}),
	description: copy("admin:core.notifications.requests.ready.description", {
		defaultMessage: "Your request has every approval it needs.",
	}),
	level: "success",
	actionRequired: true,
	audience: "recipients",
	data: requestData.extend({ scheduled: z.boolean() }),
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.ready.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} is ready to complete",
		}),
		body: data.scheduled
			? copy("server:core.notifications.requests.ready.scheduled.body", {
					defaultMessage:
						"Every approval is in. It will complete as scheduled.",
				})
			: copy("server:core.notifications.requests.ready.body", {
					defaultMessage:
						"Every approval is in. Complete it now or schedule it.",
				}),
		href: requestHref(data.requestId),
	}),
});
