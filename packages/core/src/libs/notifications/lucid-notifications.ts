import { inputNeededNotification } from "../../services/agent/notifications/input-needed.js";
import { routineFailedNotification } from "../../services/agent/notifications/routine-failed.js";
import { routineNeedsReviewNotification } from "../../services/agent/notifications/routine-needs-review.js";
import { routineReportNotification } from "../../services/agent/notifications/routine-report.js";
import { assignedNotification } from "../../services/document-workflows/notifications/assigned.js";
import { stageChangedNotification } from "../../services/document-workflows/notifications/stage-changed.js";
import { storageNotification } from "../../services/media/notifications/storage.js";
import { approvalDismissedNotification } from "../../services/requests/notifications/approval-dismissed.js";
import { approvedNotification } from "../../services/requests/notifications/approved.js";
import { closedNotification } from "../../services/requests/notifications/closed.js";
import { commentedNotification } from "../../services/requests/notifications/commented.js";
import { completedNotification } from "../../services/requests/notifications/completed.js";
import { failedNotification } from "../../services/requests/notifications/failed.js";
import { mentionedNotification } from "../../services/requests/notifications/mentioned.js";
import { readyNotification } from "../../services/requests/notifications/ready.js";
import { reviewRequestedNotification } from "../../services/requests/notifications/review-requested.js";

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
	agent: {
		inputNeeded: inputNeededNotification,
		routineFailed: routineFailedNotification,
		routineNeedsReview: routineNeedsReviewNotification,
		routineReport: routineReportNotification,
	},
} as const;
