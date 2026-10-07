import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { requestData, requestHref } from "./shared.js";

export const commentedNotification = defineNotification({
	key: "requests:commented",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.commented.name", {
		defaultMessage: "New comment",
	}),
	description: copy("admin:core.notifications.requests.commented.description", {
		defaultMessage: "Someone comments on a request you are part of.",
	}),
	audience: "recipients",
	defaults: { email: false },
	data: requestData.extend({ excerpt: z.string() }),
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.commented.title", {
			data: { title: data.title },
			defaultMessage: "New comment on {{title}}",
		}),
		body: copy.literal(data.excerpt),
		href: requestHref(data.requestId),
	}),
});
