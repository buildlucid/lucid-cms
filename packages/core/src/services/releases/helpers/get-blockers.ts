import executeHooks from "../../../libs/hooks/execute-hooks.js";
import type { ReleaseBlocker } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { ReleaseRecord, ReleaseState } from "../types.js";
import getDocumentBlockers from "./get-document-blockers.js";

/**
 * Collects what stops a release being approved or published: core document
 * checks, then anything release check hooks report about documents that are
 * otherwise usable.
 */
const getBlockers: ServiceFn<
	[{ release: ReleaseRecord; state: ReleaseState }],
	ReleaseBlocker[]
> = async (context, data) => {
	const blockers = data.release.documents.flatMap((document) => {
		const state = data.state.get(document.id);
		if (!state) return [];

		return getDocumentBlockers(context, {
			release: data.release,
			document,
			state,
		}).map((blocker) => ({ ...blocker, releaseDocumentId: document.id }));
	});
	if (data.release.status !== "open") {
		return { error: undefined, data: blockers };
	}

	const hookRes = await executeHooks(
		context,
		{ service: "releases", event: "check", config: context.config },
		{
			meta: {},
			data: {
				release: { id: data.release.id, revision: data.release.revision },
				documents: data.release.documents.flatMap((document) => {
					const state = data.state.get(document.id);
					if (!state?.collection || state.migrationRequired || state.deleted) {
						return [];
					}
					return [
						{
							releaseDocumentId: document.id,
							collectionKey: document.collection_key,
							documentId: document.document_id,
							source: document.source,
							versionId: state.release?.id ?? null,
							targets: document.targets.map((target) => target.target),
						},
					];
				}),
				blockers: [],
			},
		},
	);
	if (hookRes.error) return hookRes;

	return {
		error: undefined,
		data: [
			...blockers,
			...hookRes.data.blockers.map(
				(blocker): ReleaseBlocker => ({
					code: "check",
					releaseDocumentId: blocker.releaseDocumentId,
					target: blocker.target,
					message: blocker.message,
				}),
			),
		],
	};
};

export default getBlockers;
