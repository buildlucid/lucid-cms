import type { UserDisplay } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestDocumentRecord, RequestRecord } from "../types.js";
import allowsSelfApproval from "./allows-self-approval.js";
import getRequestReaders from "./get-request-readers.js";
import requestTypePermissions from "./request-type-permissions.js";

/** People who can approve a request, optionally narrowed by name, IDs or a limit. */
const getEligibleReviewers: ServiceFn<
	[
		{
			request: Pick<RequestRecord, "type" | "created_by"> & {
				documents: Array<Pick<RequestDocumentRecord, "collection_key">>;
			};
			ids?: number[];
			name?: string;
			limit?: number;
		},
	],
	UserDisplay[]
> = async (context, data) => {
	const readersRes = await getRequestReaders(context, {
		request: data.request,
		actions: [requestTypePermissions[data.request.type].approve, "review"],
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
