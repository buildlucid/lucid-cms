import {
	RequestApprovalsRepository,
	RequestEventsRepository,
	RequestReviewersRepository,
	RequestsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveNotification from "../../notifications/resolve.js";
import sendNotification from "../../notifications/send.js";
import { approvalDismissedNotification } from "../notifications/approval-dismissed.js";
import { requestNotificationKeys } from "../notifications/keys.js";
import { readyNotification } from "../notifications/ready.js";
import { reviewRequestedNotification } from "../notifications/review-requested.js";

/**
 * Moves requests to a new revision after their content or plan changes, so
 * earlier approvals no longer apply. Requests that had approvals record why.
 */
const dismissApproval: ServiceFn<
	[{ ids: number[]; userId?: number | null }],
	undefined
> = async (context, data) => {
	const ids = [...new Set(data.ids)];
	if (ids.length === 0) return { error: undefined, data: undefined };

	const Requests = new RequestsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);
	const RequestApprovals = new RequestApprovalsRepository(context.db);
	const RequestReviewers = new RequestReviewersRepository(context.db);

	const approvedRes = await Requests.selectIdsWithApprovals({ ids });
	if (approvedRes.error) return approvedRes;

	const approvedIds = approvedRes.data;
	if (approvedIds.length === 0) {
		const dismissRes = await Requests.dismissApproval({ ids });
		if (dismissRes.error) return dismissRes;

		return { error: undefined, data: undefined };
	}

	const [requestsRes, approvalsRes, reviewersRes] = await Promise.all([
		Requests.selectMultiple({
			select: ["id", "title", "revision"],
			where: [{ key: "id", operator: "in", value: approvedIds }],
		}),
		RequestApprovals.selectMultiple({
			select: ["request_id", "user_id", "revision"],
			where: [{ key: "request_id", operator: "in", value: approvedIds }],
		}),
		RequestReviewers.selectMultiple({
			select: ["request_id", "user_id"],
			where: [{ key: "request_id", operator: "in", value: approvedIds }],
		}),
	]);
	if (requestsRes.error) return requestsRes;
	if (approvalsRes.error) return approvalsRes;
	if (reviewersRes.error) return reviewersRes;

	const dismissRes = await Requests.dismissApproval({ ids });
	if (dismissRes.error) return dismissRes;

	const eventsRes = await RequestEvents.createEvents({
		data: approvedIds.map((requestId) => ({
			request_id: requestId,
			user_id: data.userId ?? null,
			type: "approval_dismissed" as const,
		})),
	});
	if (eventsRes.error) return eventsRes;

	//* approvers hear their approval no longer counts, and reviewers get the request back on their list
	for (const request of requestsRes.data ?? []) {
		const notification = { requestId: request.id, title: request.title };
		const dismissedRes = await sendNotification(context, {
			definition: approvalDismissedNotification,
			recipients: (approvalsRes.data ?? []).flatMap((approval) =>
				approval.request_id === request.id &&
				approval.revision === request.revision &&
				approval.user_id !== null
					? [approval.user_id]
					: [],
			),
			actorUserId: data.userId,
			data: notification,
		});
		if (dismissedRes.error) return dismissedRes;

		const readyRes = await resolveNotification(context, {
			definition: readyNotification,
			key: requestNotificationKeys.ready(request.id),
		});
		if (readyRes.error) return readyRes;

		for (const reviewer of reviewersRes.data ?? []) {
			if (reviewer.request_id !== request.id) continue;
			const reviewRes = await sendNotification(context, {
				definition: reviewRequestedNotification,
				key: requestNotificationKeys.review(request.id, reviewer.user_id),
				recipients: [reviewer.user_id],
				actorUserId: data.userId,
				data: notification,
			});
			if (reviewRes.error) return reviewRes;
		}
	}

	return { error: undefined, data: undefined };
};

export default dismissApproval;
