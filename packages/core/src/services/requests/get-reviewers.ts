import type { LucidActor } from "../../types/hono.js";
import type { UserDisplay } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getEligibleReviewers from "./helpers/get-eligible-reviewers.js";
import loadRequest from "./helpers/load-request.js";

/** Lists people who can be asked to approve a request, by name or ID. */
const getReviewers: ServiceFn<
	[
		{
			id: number;
			user: LucidActor;
			ids?: number[];
			name?: string;
			limit?: number;
		},
	],
	UserDisplay[]
> = async (context, data) => {
	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	return getEligibleReviewers(context, {
		request: requestRes.data,
		ids: data.ids,
		name: data.name,
		limit: data.limit,
	});
};

export default getReviewers;
