import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { requestData, requestHref } from "./shared.js";

export const approvalDismissedNotification = defineNotification({
	key: "requests:approval-dismissed",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.approval-dismissed.name", {
		defaultMessage: "Approval dismissed",
	}),
	description: copy(
		"admin:core.notifications.requests.approval-dismissed.description",
		{ defaultMessage: "A request changed after you approved it." },
	),
	audience: "recipients",
	defaults: { email: false },
	data: requestData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.approval-dismissed.title", {
			data: { title: data.title },
			defaultMessage: "Your approval of {{title}} was dismissed",
		}),
		body: copy("server:core.notifications.requests.approval-dismissed.body", {
			defaultMessage: "The request changed, so it needs approving again.",
		}),
		href: requestHref(data.requestId),
	}),
});
