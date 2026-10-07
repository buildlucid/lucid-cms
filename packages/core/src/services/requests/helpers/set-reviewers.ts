import { copy } from "../../../libs/i18n/index.js";
import {
	RequestEventsRepository,
	RequestReviewersRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveNotification from "../../notifications/resolve.js";
import sendNotification from "../../notifications/send.js";
import { requestNotificationKeys } from "../notifications/keys.js";
import { reviewRequestedNotification } from "../notifications/review-requested.js";
import type { RequestDocumentRecord, RequestRecord } from "../types.js";
import getEligibleReviewers from "./get-eligible-reviewers.js";

/** Sets a request's reviewers, keeping existing ones. Each change is added to the activity. */
const setReviewers: ServiceFn<
	[
		{
			request: Pick<
				RequestRecord,
				"id" | "type" | "title" | "created_by" | "reviewers"
			> & {
				documents: Array<Pick<RequestDocumentRecord, "collection_key">>;
			};
			reviewerIds: number[];
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const RequestReviewers = new RequestReviewersRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const reviewerIds = [...new Set(data.reviewerIds)];
	const eligibleRes = await getEligibleReviewers(context, {
		request: data.request,
	});
	if (eligibleRes.error) return eligibleRes;

	//* existing reviewers can stay, as approving adds people who may not be eligible to be asked
	const allowed = (id: number) =>
		eligibleRes.data.some((reviewer) => reviewer.id === id) ||
		data.request.reviewers.some((reviewer) => reviewer.user_id === id);
	if (reviewerIds.some((id) => !allowed(id))) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.reviewers.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	const removedIds = data.request.reviewers
		.map((reviewer) => reviewer.user_id)
		.filter((id) => !reviewerIds.includes(id));
	const addedIds = reviewerIds.filter(
		(id) => !data.request.reviewers.some((reviewer) => reviewer.user_id === id),
	);

	if (removedIds.length > 0) {
		const deleteRes = await RequestReviewers.deleteMultiple({
			where: [
				{ key: "request_id", operator: "=", value: data.request.id },
				{ key: "user_id", operator: "in", value: removedIds },
			],
		});
		if (deleteRes.error) return deleteRes;
	}

	if (addedIds.length > 0) {
		const createRes = await RequestReviewers.createMultiple({
			data: addedIds.map((userId) => ({
				request_id: data.request.id,
				user_id: userId,
				assigned_by: data.userId,
			})),
		});
		if (createRes.error) return createRes;
	}

	if (addedIds.length > 0 || removedIds.length > 0) {
		const eventsRes = await RequestEvents.createEvents({
			data: [
				...addedIds.map((userId) => ({
					request_id: data.request.id,
					user_id: data.userId,
					type: "reviewer_added" as const,
					metadata: { userId },
				})),
				...removedIds.map((userId) => ({
					request_id: data.request.id,
					user_id: data.userId,
					type: "reviewer_removed" as const,
					metadata: { userId },
				})),
			],
		});
		if (eventsRes.error) return eventsRes;
	}

	for (const userId of addedIds) {
		const sendRes = await sendNotification(context, {
			definition: reviewRequestedNotification,
			key: requestNotificationKeys.review(data.request.id, userId),
			recipients: [userId],
			actorUserId: data.userId,
			data: { requestId: data.request.id, title: data.request.title },
		});
		if (sendRes.error) return sendRes;
	}
	for (const userId of removedIds) {
		const resolveRes = await resolveNotification(context, {
			definition: reviewRequestedNotification,
			key: requestNotificationKeys.review(data.request.id, userId),
		});
		if (resolveRes.error) return resolveRes;
	}

	return { error: undefined, data: undefined };
};

export default setReviewers;
