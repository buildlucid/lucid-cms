import type { UserDisplay } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import allowsSelfApproval from "./allows-self-approval.js";
import type { RequestReadFacts } from "./can-read-request.js";
import getRequestReaders from "./get-request-readers.js";

/** People who can approve a request, optionally narrowed by name, IDs or a limit. */
const getEligibleReviewers: ServiceFn<
	[
		{
			request: Omit<RequestReadFacts, "reviewers">;
			ids?: number[];
			name?: string;
			limit?: number;
		},
	],
	UserDisplay[]
> = async (context, data) => {
	const readersRes = await getRequestReaders(context, {
		//* reviewing every collection already lets someone read the request
		request: { ...data.request, reviewers: [] },
		actions: ["review"],
		ids: data.ids,
		name: data.name,
		//* one extra in case the creator is filtered out below
		limit: data.limit === undefined ? undefined : data.limit + 1,
	});
	if (readersRes.error) return readersRes;

	const selfApproval = allowsSelfApproval(
		context,
		data.request.documents.map((document) => document.collection_key),
	);

	return {
		error: undefined,
		data: readersRes.data
			.filter((user) => selfApproval || user.id !== data.request.created_by)
			.slice(0, data.limit),
	};
};

export default getEligibleReviewers;
