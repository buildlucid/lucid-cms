import { ReleaseReviewersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ReleaseRecord } from "../types.js";

/** Adds someone who approved or withdrew an approval to the reviewers, if they are not one already. */
const addReviewer: ServiceFn<
	[{ release: Pick<ReleaseRecord, "id" | "reviewers">; userId: number }],
	undefined
> = async (context, data) => {
	if (
		data.release.reviewers.some((reviewer) => reviewer.user_id === data.userId)
	) {
		return { error: undefined, data: undefined };
	}

	const ReleaseReviewers = new ReleaseReviewersRepository(context.db);
	const createRes = await ReleaseReviewers.createSingle({
		data: {
			release_id: data.release.id,
			user_id: data.userId,
			assigned_by: data.userId,
		},
	});
	if (createRes.error) return createRes;

	return { error: undefined, data: undefined };
};

export default addReviewer;
