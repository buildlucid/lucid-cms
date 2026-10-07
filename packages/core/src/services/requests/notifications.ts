import z from "zod";
import { copy } from "../../libs/i18n/copy.js";
import { notificationCategories } from "../../libs/notifications/categories.js";
import defineNotification from "../../libs/notifications/define-notification.js";

const requestData = z.object({
	requestId: z.number(),
	title: z.string(),
});

const requestHref = (requestId: number) => `/lucid/requests/${requestId}`;

/** Keys for the per-person request notifications, so they can be resolved later. */
export const requestNotificationKeys = {
	review: (requestId: number, userId: number) =>
		`request:${requestId}:review:${userId}`,
	ready: (requestId: number) => `request:${requestId}:ready`,
	failed: (requestId: number) => `request:${requestId}:failed`,
};

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
				"Your approval is needed before this request can be published.",
		}),
		href: requestHref(data.requestId),
	}),
});

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

export const approvedNotification = defineNotification({
	key: "requests:approved",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.approved.name", {
		defaultMessage: "Approval given",
	}),
	description: copy("admin:core.notifications.requests.approved.description", {
		defaultMessage: "A reviewer approves your request.",
	}),
	level: "success",
	audience: "recipients",
	defaults: { email: false },
	data: requestData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.approved.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} was approved",
		}),
		href: requestHref(data.requestId),
	}),
});

export const readyNotification = defineNotification({
	key: "requests:ready",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.ready.name", {
		defaultMessage: "Ready to publish",
	}),
	description: copy("admin:core.notifications.requests.ready.description", {
		defaultMessage: "Your request has every approval it needs.",
	}),
	level: "success",
	actionRequired: true,
	audience: "recipients",
	data: requestData.extend({ scheduled: z.boolean() }),
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.ready.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} is ready to publish",
		}),
		body: data.scheduled
			? copy("server:core.notifications.requests.ready.scheduled.body", {
					defaultMessage: "Every approval is in. It will publish as scheduled.",
				})
			: copy("server:core.notifications.requests.ready.body", {
					defaultMessage:
						"Every approval is in. Publish it now or schedule it.",
				}),
		href: requestHref(data.requestId),
	}),
});

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

export const completedNotification = defineNotification({
	key: "requests:completed",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.completed.name", {
		defaultMessage: "Request published",
	}),
	description: copy("admin:core.notifications.requests.completed.description", {
		defaultMessage: "A request you are part of has been published.",
	}),
	level: "success",
	audience: "recipients",
	defaults: { email: false },
	data: requestData,
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.completed.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} was published",
		}),
		href: requestHref(data.requestId),
	}),
});

export const failedNotification = defineNotification({
	key: "requests:failed",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.failed.name", {
		defaultMessage: "Publish failed",
	}),
	description: copy("admin:core.notifications.requests.failed.description", {
		defaultMessage: "A request you made or scheduled could not be published.",
	}),
	level: "error",
	actionRequired: true,
	audience: "recipients",
	data: requestData.extend({ message: z.string() }),
	render: ({ data }) => ({
		title: copy("server:core.notifications.requests.failed.title", {
			data: { title: data.title },
			defaultMessage: "{{title}} failed to publish",
		}),
		body: copy.literal(data.message),
		href: requestHref(data.requestId),
	}),
});

export const closedNotification = defineNotification({
	key: "requests:closed",
	category: notificationCategories.requests,
	name: copy("admin:core.notifications.requests.closed.name", {
		defaultMessage: "Request closed",
	}),
	description: copy("admin:core.notifications.requests.closed.description", {
		defaultMessage: "A request you are part of is closed or reopened.",
	}),
	audience: "recipients",
	defaults: { email: false },
	data: requestData.extend({ reopened: z.boolean() }),
	render: ({ data }) => ({
		title: data.reopened
			? copy("server:core.notifications.requests.reopened.title", {
					data: { title: data.title },
					defaultMessage: "{{title}} was reopened",
				})
			: copy("server:core.notifications.requests.closed.title", {
					data: { title: data.title },
					defaultMessage: "{{title}} was closed",
				}),
		href: requestHref(data.requestId),
	}),
});
