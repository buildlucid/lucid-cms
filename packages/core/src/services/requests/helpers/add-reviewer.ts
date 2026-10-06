import { RequestReviewersRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestRecord } from "../types.js";

/** Adds someone who approved or withdrew an approval to the reviewers, if they are not one already. */
const addReviewer: ServiceFn<
	[{ request: Pick<RequestRecord, "id" | "reviewers">; userId: number }],
	undefined
> = async (context, data) => {
	if (
		data.request.reviewers.some((reviewer) => reviewer.user_id === data.userId)
	) {
		return { error: undefined, data: undefined };
	}

	const RequestReviewers = new RequestReviewersRepository(context.db);
	const createRes = await RequestReviewers.createSingle({
		data: {
			request_id: data.request.id,
			user_id: data.userId,
			assigned_by: data.userId,
		},
	});
	if (createRes.error) return createRes;

	return { error: undefined, data: undefined };
};

export default addReviewer;
