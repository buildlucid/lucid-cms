import { copy } from "../../../libs/i18n/copy.js";
import { notificationCategories } from "../../../libs/notifications/categories.js";
import defineNotification from "../../../libs/notifications/define-notification.js";
import { workflowData, workflowHref } from "./shared.js";

export const assignedNotification = defineNotification({
	key: "workflows:assigned",
	category: notificationCategories.workflows,
	name: copy("admin:core.notifications.workflows.assigned.name", {
		defaultMessage: "Assigned to you",
	}),
	description: copy("admin:core.notifications.workflows.assigned.description", {
		defaultMessage: "A document is assigned to you.",
	}),
	actionRequired: true,
	audience: "recipients",
	data: workflowData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.workflows.assigned.title", {
			data: { label: data.label ?? `#${data.documentId}` },
			defaultMessage: "{{label}} was assigned to you",
		}),
		body: copy("server:core.notifications.workflows.assigned.body", {
			data: { stage: data.stage },
			defaultMessage: "It is in the {{stage}} stage.",
		}),
		href: workflowHref(data),
	}),
});
