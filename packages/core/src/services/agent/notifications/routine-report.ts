import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { chatHref, routineData } from "./shared.js";

export const routineReportNotification = defineNotification({
	key: "agent:routine-report",
	category: notificationCategories.agent,
	name: copy("admin:core.notifications.agent.routine-report.name", {
		defaultMessage: "Routine report",
	}),
	description: copy(
		"admin:core.notifications.agent.routine-report.description",
		{
			defaultMessage:
				"A routine you look after finishes with something to report.",
		},
	),
	level: "success",
	audience: "recipients",
	defaults: { email: false },
	data: routineData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.agent.routine-report.title", {
			data: { name: data.name },
			defaultMessage: "{{name}} finished",
		}),
		body: copy.literal(data.excerpt),
		href: chatHref(data.conversationId),
	}),
});
