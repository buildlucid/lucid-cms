import { ReleaseDocumentsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import dismissApproval from "./dismiss-approval.js";

/**
 * Called before documents, or a whole collection, are permanently deleted.
 * Releases keep their place in the history but stop pointing at the
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

	const ReleaseDocuments = new ReleaseDocumentsRepository(context.db);
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

	const releasesRes = await ReleaseDocuments.selectMultiple({
		select: ["release_id"],
		where,
	});
	if (releasesRes.error) return releasesRes;

	const dismissRes = await dismissApproval(context, {
		ids: (releasesRes.data ?? []).map((release) => release.release_id),
	});
	if (dismissRes.error) return dismissRes;

	const detachRes = await ReleaseDocuments.updateMultiple({
		data: { source_version_id: null, approved_version_id: null },
		where,
	});
	if (detachRes.error) return detachRes;

	return { error: undefined, data: undefined };
};

export default detachDocuments;
