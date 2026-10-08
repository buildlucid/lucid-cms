import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { requestData, requestHref } from "./shared.js";

export const reviewRequestedNotification = defineNotification({
	key: "requests:review-requested",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.review-requested.name", {
		defaultMessage: "Review requested",
	}),
	description: copy(
		"admin:core.notifications.requests.review-requested.description",
		{ defaultMessage: "You are asked to review a request." },
	),
	actionRequired: true,
	audience: "recipients",
	data: requestData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.review-requested.title", {
			data: { title: data.title },
			defaultMessage: "Review requested: {{title}}",
		}),
		body: copy("server:core.notifications.requests.review-requested.body", {
			defaultMessage:
				"Your approval is needed before this request can be completed.",
		}),
		href: requestHref(data.requestId),
	}),
});
