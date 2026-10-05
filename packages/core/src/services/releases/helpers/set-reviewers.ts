import { copy } from "../../../libs/i18n/index.js";
import {
	ReleaseEventsRepository,
	ReleaseReviewersRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ReleaseDocumentRecord, ReleaseRecord } from "../types.js";
import getEligibleReviewers from "./get-eligible-reviewers.js";

/** Sets a release's reviewers, keeping existing ones. Each change is added to the activity. */
const setReviewers: ServiceFn<
	[
		{
			release: Pick<ReleaseRecord, "id" | "created_by" | "reviewers"> & {
				documents: Array<Pick<ReleaseDocumentRecord, "collection_key">>;
			};
			reviewerIds: number[];
			userId: number;
		},
	],
	undefined
> = async (context, data) => {
	const ReleaseReviewers = new ReleaseReviewersRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const reviewerIds = [...new Set(data.reviewerIds)];
	const eligibleRes = await getEligibleReviewers(context, {
		release: data.release,
	});
	if (eligibleRes.error) return eligibleRes;

	//* existing reviewers can stay, as approving adds people who may not be eligible to be asked
	const allowed = (id: number) =>
		eligibleRes.data.some((reviewer) => reviewer.id === id) ||
		data.release.reviewers.some((reviewer) => reviewer.user_id === id);
	if (reviewerIds.some((id) => !allowed(id))) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.releases.reviewers.invalid"),
				status: 400,
			},
			data: undefined,
		};
	}

	const removedIds = data.release.reviewers
		.map((reviewer) => reviewer.user_id)
		.filter((id) => !reviewerIds.includes(id));
	const addedIds = reviewerIds.filter(
		(id) => !data.release.reviewers.some((reviewer) => reviewer.user_id === id),
	);

	if (removedIds.length > 0) {
		const deleteRes = await ReleaseReviewers.deleteMultiple({
			where: [
				{ key: "release_id", operator: "=", value: data.release.id },
				{ key: "user_id", operator: "in", value: removedIds },
			],
		});
		if (deleteRes.error) return deleteRes;
	}

	if (addedIds.length > 0) {
		const createRes = await ReleaseReviewers.createMultiple({
			data: addedIds.map((userId) => ({
				release_id: data.release.id,
				user_id: userId,
				assigned_by: data.userId,
			})),
		});
		if (createRes.error) return createRes;
	}

	if (addedIds.length > 0 || removedIds.length > 0) {
		const eventsRes = await ReleaseEvents.createEvents({
			data: [
				...addedIds.map((userId) => ({
					release_id: data.release.id,
					user_id: data.userId,
					type: "reviewer_added" as const,
					metadata: { userId },
				})),
				...removedIds.map((userId) => ({
					release_id: data.release.id,
					user_id: data.userId,
					type: "reviewer_removed" as const,
					metadata: { userId },
				})),
			],
		});
		if (eventsRes.error) return eventsRes;
	}

	return { error: undefined, data: undefined };
};

export default setReviewers;
