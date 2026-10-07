import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { requestData, requestHref } from "./shared.js";

export const mentionedNotification = defineNotification({
	key: "requests:mentioned",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.mentioned.name", {
		defaultMessage: "Mentioned",
	}),
	description: copy("admin:core.notifications.requests.mentioned.description", {
		defaultMessage: "Someone mentions you in a request.",
	}),
	audience: "recipients",
	data: requestData.extend({ excerpt: z.string() }),
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.mentioned.title", {
			data: { title: data.title },
			defaultMessage: "You were mentioned in {{title}}",
		}),
		body: copy.literal(data.excerpt),
		href: requestHref(data.requestId),
	}),
});
