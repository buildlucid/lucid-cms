import type { RequestRecord } from "../types.js";

/** The people involved in a request: whoever made it and its reviewers. */
const getRequestParticipants = (
	request: Pick<RequestRecord, "created_by" | "reviewers">,
) => [
	...new Set([
		...(request.created_by === null ? [] : [request.created_by]),
		...request.reviewers.map((reviewer) => reviewer.user_id),
	]),
];

export default getRequestParticipants;
