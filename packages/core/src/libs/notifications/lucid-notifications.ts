import {
	assignedNotification,
	stageChangedNotification,
} from "../../services/document-workflows/notifications.js";
import { storageNotification } from "../../services/media/notifications.js";
import {
	approvalDismissedNotification,
	approvedNotification,
	closedNotification,
	commentedNotification,
	completedNotification,
	failedNotification,
	mentionedNotification,
	readyNotification,
	reviewRequestedNotification,
} from "../../services/requests/notifications.js";

/**
 * Lucid's own notification types. Pass one as the `type` to
 * `toolkit.notifications.send` to send it from your own code, or to
 * `resolve` to clear it.
 *
 * @example
 * ```ts
 * await toolkit.notifications.send({
 * 	type: notifications.requests.commented,
 * 	recipients: [authorId],
 * 	data: { requestId: 12, title: "Homepage launch", excerpt: "Looks good" },
 * });
 * ```
 */
export const notifications = {
	storage: storageNotification,
	requests: {
		reviewRequested: reviewRequestedNotification,
		mentioned: mentionedNotification,
		commented: commentedNotification,
		approved: approvedNotification,
		ready: readyNotification,
		approvalDismissed: approvalDismissedNotification,
		completed: completedNotification,
		failed: failedNotification,
		closed: closedNotification,
	},
	workflows: {
		assigned: assignedNotification,
		stageChanged: stageChangedNotification,
	},
} as const;
