import z from "zod";
import { copy } from "../../libs/i18n/copy.js";
import { notificationCategories } from "../../libs/notifications/categories.js";
import defineNotification from "../../libs/notifications/define-notification.js";

const workflowData = z.object({
	collectionKey: z.string(),
	documentId: z.number(),
	/** The open request that owns the proposal, when the workflow is not on latest. */
	requestId: z.number().nullable(),
	label: z.string().nullable(),
	stage: z.string(),
});

const workflowHref = (data: z.output<typeof workflowData>) =>
	data.requestId === null
		? `/lucid/collections/${data.collectionKey}/latest/${data.documentId}`
		: `/lucid/requests/${data.requestId}/content/${data.collectionKey}/${data.documentId}`;

/** Keys for the per-person assignment notifications, so they can be resolved later. */
export const workflowNotificationKeys = {
	assigned: (workflowId: number, userId: number) =>
		`workflow:${workflowId}:assignee:${userId}`,
};

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

export const stageChangedNotification = defineNotification({
	key: "workflows:stage-changed",
	category: notificationCategories.workflows,
	name: copy("admin:core.notifications.workflows.stage-changed.name", {
		defaultMessage: "Stage changed",
	}),
	description: copy(
		"admin:core.notifications.workflows.stage-changed.description",
		{ defaultMessage: "A document assigned to you moves to another stage." },
	),
	audience: "recipients",
	defaults: { email: false },
	data: workflowData.extend({ previousStage: z.string() }),
	render: ({ data }) => ({
		title: copy("server:core.notifications.workflows.stage-changed.title", {
			data: { label: data.label ?? `#${data.documentId}`, stage: data.stage },
			defaultMessage: "{{label}} moved to {{stage}}",
		}),
		body: copy("server:core.notifications.workflows.stage-changed.body", {
			data: { previous: data.previousStage, stage: data.stage },
			defaultMessage: "Moved from {{previous}} to {{stage}}.",
		}),
		href: workflowHref(data),
	}),
});
