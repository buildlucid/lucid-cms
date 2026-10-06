import type { LucidUser } from "../../types/hono.js";
import type { RequestUser } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getEligibleReviewers from "./helpers/get-eligible-reviewers.js";
import loadRequest from "./helpers/load-request.js";

const getReviewers: ServiceFn<
	[{ id: number; user: LucidUser }],
	RequestUser[]
> = async (context, data) => {
	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	return getEligibleReviewers(context, { request: requestRes.data });
};

export default getReviewers;
