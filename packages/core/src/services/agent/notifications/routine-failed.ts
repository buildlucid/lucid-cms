import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { chatHref, routineData } from "./shared.js";

export const routineFailedNotification = defineNotification({
	key: "agent:routine-failed",
	category: notificationCategories.agent,
	name: copy("admin:core.notifications.agent.routine-failed.name", {
		defaultMessage: "Routine failed",
	}),
	description: copy(
		"admin:core.notifications.agent.routine-failed.description",
		{ defaultMessage: "A routine you look after stops with an error." },
	),
	level: "error",
	actionRequired: true,
	audience: "recipients",
	data: routineData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.agent.routine-failed.title", {
			data: { name: data.name },
			defaultMessage: "{{name}} failed",
		}),
		body: copy.literal(data.excerpt),
		href: chatHref(data.conversationId),
	}),
});
