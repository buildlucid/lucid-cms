import executeHooks from "../../../libs/hooks/execute-hooks.js";
import type { RequestBlocker } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestRecord, RequestState } from "../types.js";
import getDocumentBlockers from "./get-document-blockers.js";

/**
 * Collects what stops a request being approved or published: core document
 * checks, then anything request check hooks report about documents that are
 * otherwise usable.
 */
const getBlockers: ServiceFn<
	[{ request: RequestRecord; state: RequestState }],
	RequestBlocker[]
> = async (context, data) => {
	const blockers = data.request.documents.flatMap((document) => {
		const state = data.state.get(document.id);
		if (!state) return [];

		return getDocumentBlockers(context, {
			request: data.request,
			document,
			state,
		}).map((blocker) => ({ ...blocker, requestDocumentId: document.id }));
	});
	if (data.request.status !== "open") {
		return { error: undefined, data: blockers };
	}

	const hookRes = await executeHooks(
		context,
		{ service: "requests", event: "check", config: context.config },
		{
			meta: {},
			data: {
				request: { id: data.request.id, revision: data.request.revision },
				documents: data.request.documents.flatMap((document) => {
					const state = data.state.get(document.id);
					if (!state?.collection || state.migrationRequired || state.deleted) {
						return [];
					}
					return [
						{
							requestDocumentId: document.id,
							collectionKey: document.collection_key,
							documentId: document.document_id,
							source: document.source,
							versionId: state.request?.id ?? null,
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
				(blocker): RequestBlocker => ({
					code: "check",
					requestDocumentId: blocker.requestDocumentId,
					target: blocker.target,
					message: blocker.message,
				}),
			),
		],
	};
};

export default getBlockers;
