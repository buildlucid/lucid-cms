import { ReleasesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import dismissApproval from "./dismiss-approval.js";

/**
 * Called after document content changes. Open releases that publish to the
 * changed version or own the edited proposal lose their approval, so reviewers
 * always approve what will actually be released. Latest stays independent of existing releases.
 */
const invalidateReleases: ServiceFn<
	[
		{
			collectionKey: string;
			documentIds: number[];
			/** The version type that was written, eg. latest or production. */
			versionType?: string;
			/** The proposal version that was written. */
			versionId?: number;
			/** The release doing the writing, which keeps its approval. */
			releaseId?: number;
			userId?: number | null;
		},
	],
	undefined
> = async (context, data) => {
	if (data.documentIds.length === 0 || data.versionType === "latest") {
		return { error: undefined, data: undefined };
	}

	const Releases = new ReleasesRepository(context.db);
	const affectedRes = await Releases.selectAffectedReleaseIds({
		collectionKey: data.collectionKey,
		documentIds: data.documentIds,
		versionType: data.versionType,
		versionId: data.versionId,
	});
	if (affectedRes.error) return affectedRes;

	return dismissApproval(context, {
		ids: affectedRes.data.filter((id) => id !== data.releaseId),
		userId: data.userId,
	});
};

export default invalidateReleases;
