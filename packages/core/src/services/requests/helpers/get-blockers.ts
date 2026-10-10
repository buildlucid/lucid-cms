import executeHooks from "../../../libs/hooks/execute-hooks.js";
import type { RequestBlocker } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { RequestRecord, RequestState } from "../types.js";
import countOpenComments from "./count-open-comments.js";
import getDocumentBlockers from "./get-document-blockers.js";

/** Collects approval and completion blockers from document checks, open comments and collection hooks. */
const getBlockers: ServiceFn<
	[{ request: RequestRecord; state: RequestState }],
	RequestBlocker[]
> = async (context, data) => {
	const blockers: RequestBlocker[] = data.request.documents.flatMap(
		(document) => {
			const state = data.state.get(document.id);
			if (!state) return [];

			return getDocumentBlockers(context, {
				request: data.request,
				document,
				state,
			}).map((blocker) => ({ ...blocker, requestDocumentId: document.id }));
		},
	);
	if (data.request.status !== "open") {
		return { error: undefined, data: blockers };
	}
	//* comments withdraw approval, so open ones only ever hold up approving
	if (countOpenComments({ events: data.request.events }) > 0) {
		blockers.push({ code: "comments_open" });
	}

	const checkable = data.request.documents.flatMap((document) => {
		const state = data.state.get(document.id);
		if (
			!state?.collection ||
			state.migrationRequired ||
			state.deleted !== null
		) {
			return [];
		}
		return [{ document, state, collection: state.collection }];
	});
	const byCollection = Map.groupBy(checkable, (item) => item.collection);

	for (const [collection, items] of byCollection) {
		const hookRes = await executeHooks(
			context,
			{
				service: "requests",
				event: "check",
				config: context.config,
				collectionInstance: collection,
			},
			{
				meta: {},
				data: {
					request: {
						id: data.request.id,
						type: data.request.type,
						revision: data.request.revision,
					},
					documents: items.map(({ document, state }) => ({
						requestDocumentId: document.id,
						collectionKey: document.collection_key,
						documentId: document.document_id,
						source: document.source,
						versionId: state.request?.id ?? null,
						targets: document.targets.map((target) => target.target),
					})),
					blockers: [],
				},
			},
		);
		if (hookRes.error) return hookRes;

		blockers.push(
			...hookRes.data.blockers.map(
				(blocker): RequestBlocker => ({
					code: "check",
					requestDocumentId: blocker.requestDocumentId,
					target: blocker.target,
					message: blocker.message,
				}),
			),
		);
	}

	return { error: undefined, data: blockers };
};

export default getBlockers;
