import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { chatHref, routineData } from "./shared.js";

export const routineNeedsReviewNotification = defineNotification({
	key: "agent:routine-needs-review",
	category: notificationCategories.agent,
	name: copy("admin:core.notifications.agent.routine-needs-review.name", {
		defaultMessage: "Routine needs review",
	}),
	description: copy(
		"admin:core.notifications.agent.routine-needs-review.description",
		{
			defaultMessage:
				"A routine you look after asks for its work to be checked.",
		},
	),
	level: "warning",
	actionRequired: true,
	audience: "recipients",
	data: routineData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.agent.routine-needs-review.title", {
			data: { name: data.name },
			defaultMessage: "{{name}} needs review",
		}),
		body: copy.literal(data.excerpt),
		href: chatHref(data.conversationId),
	}),
});
