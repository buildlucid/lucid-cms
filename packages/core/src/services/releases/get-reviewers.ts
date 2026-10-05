import type { LucidUser } from "../../types/hono.js";
import type { ReleaseUser } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getEligibleReviewers from "./helpers/get-eligible-reviewers.js";
import loadRelease from "./helpers/load-release.js";

const getReviewers: ServiceFn<
	[{ id: number; user: LucidUser }],
	ReleaseUser[]
> = async (context, data) => {
	const releaseRes = await loadRelease(context, data);
	if (releaseRes.error) return releaseRes;

	return getEligibleReviewers(context, { release: releaseRes.data });
};

export default getReviewers;
