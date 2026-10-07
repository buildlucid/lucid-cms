import z from "zod";
import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { chatHref } from "./shared.js";

export const inputNeededNotification = defineNotification({
	key: "agent:input-needed",
	category: notificationCategories.agent,
	name: copy("admin:core.notifications.agent.input-needed.name", {
		defaultMessage: "Input needed",
	}),
	description: copy("admin:core.notifications.agent.input-needed.description", {
		defaultMessage:
			"An agent is waiting for your answer or approval, and you have not replied for a few minutes.",
	}),
	level: "warning",
	actionRequired: true,
	audience: "recipients",
	defaults: { email: false },
	data: z.object({
		conversationId: z.string(),
		title: z.string(),
		excerpt: z.string(),
	}),
	render: ({ data }) => ({
		title: copy("server:core.notifications.agent.input-needed.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} needs your input",
		}),
		body: copy.literal(data.excerpt),
		href: chatHref(data.conversationId),
	}),
});
