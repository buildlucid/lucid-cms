import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { requestData, requestHref } from "./shared.js";

export const failedNotification = defineNotification({
	key: "requests:failed",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.failed.name", {
		defaultMessage: "Request failed",
	}),
	description: copy("admin:core.notifications.requests.failed.description", {
		defaultMessage: "A request you made or scheduled could not be completed.",
	}),
	level: "error",
	actionRequired: true,
	audience: "recipients",
	email: { delayMinutes: 0 },
	data: requestData.extend({ message: z.string() }),
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.failed.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} failed to complete",
		}),
		body: copy.literal(data.message),
		href: requestHref(data.requestId),
	}),
});
