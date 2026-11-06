import { RequestsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import dismissApproval from "./dismiss-approval.js";
import touchesLocales from "./touches-locales.js";

/**
 * Invalidates approval for requests owning the edited proposal or targeting the changed version.
 * Locale-limited requests are affected only when their locales change.
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
			/** The locales the write changed, with null for shared content. Null or left out when unknown. */
			changedLocales?: ReadonlyArray<string | null> | null;
			userId?: number | null;
		},
	],
	undefined
> = async (context, data) => {
	if (data.documentIds.length === 0) {
		return { error: undefined, data: undefined };
	}

	const Requests = new RequestsRepository(context.db);
	const affectedRes = await Requests.selectAffectedRequests({
		collectionKey: data.collectionKey,
		documentIds: data.documentIds,
		versionType: data.versionType,
		versionId: data.versionId,
	});
	if (affectedRes.error) return affectedRes;

	return dismissApproval(context, {
		ids: affectedRes.data
			.filter(
				(request) =>
					request.id !== data.requestId &&
					touchesLocales(request.locales, data.changedLocales),
			)
			.map((request) => request.id),
		userId: data.userId,
	});
};

export default invalidateRequests;
