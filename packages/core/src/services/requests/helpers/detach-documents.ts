import { RequestDocumentsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import dismissApproval from "./dismiss-approval.js";

/**
 * Called before documents, or a whole collection, are permanently deleted.
 * Requests keep their place in the history but stop pointing at the
 * versions being removed.
 */
const detachDocuments: ServiceFn<
	[
		{
			collectionKey: string;
			/** Leave out to detach every document in the collection. */
			documentIds?: number[];
		},
	],
	undefined
> = async (context, data) => {
	if (data.documentIds?.length === 0) {
		return { error: undefined, data: undefined };
	}

	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const where = [
		{
			key: "collection_key" as const,
			operator: "=" as const,
			value: data.collectionKey,
		},
		...(data.documentIds
			? [
					{
						key: "document_id" as const,
						operator: "in" as const,
						value: data.documentIds,
					},
				]
			: []),
	];

	const requestsRes = await RequestDocuments.selectMultiple({
		select: ["request_id"],
		where,
	});
	if (requestsRes.error) return requestsRes;

	const dismissRes = await dismissApproval(context, {
		ids: (requestsRes.data ?? []).map((request) => request.request_id),
	});
	if (dismissRes.error) return dismissRes;

	const detachRes = await RequestDocuments.updateMultiple({
		data: { source_version_id: null, approved_version_id: null },
		where,
	});
	if (detachRes.error) return detachRes;

	return { error: undefined, data: undefined };
};

export default detachDocuments;
