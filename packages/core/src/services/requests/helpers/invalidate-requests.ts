import { RequestsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import dismissApproval from "./dismiss-approval.js";

/**
 * Called after document content changes. Open requests that publish to the
 * changed version or own the edited proposal lose their approval, so reviewers
 * always approve what will actually be completed. Latest stays independent of existing requests.
 */
const invalidateRequests: ServiceFn<
	[
		{
			collectionKey: string;
			documentIds: number[];
			/** The version type that was written, eg. latest or production. */
			versionType?: string;
			/** The proposal version that was written. */
			versionId?: number;
			/** The request doing the writing, which keeps its approval. */
			requestId?: number;
			userId?: number | null;
		},
	],
	undefined
> = async (context, data) => {
	if (data.documentIds.length === 0 || data.versionType === "latest") {
		return { error: undefined, data: undefined };
	}

	const Requests = new RequestsRepository(context.db);
	const affectedRes = await Requests.selectAffectedRequestIds({
		collectionKey: data.collectionKey,
		documentIds: data.documentIds,
		versionType: data.versionType,
		versionId: data.versionId,
	});
	if (affectedRes.error) return affectedRes;

	return dismissApproval(context, {
		ids: affectedRes.data.filter((id) => id !== data.requestId),
		userId: data.userId,
	});
};

export default invalidateRequests;
