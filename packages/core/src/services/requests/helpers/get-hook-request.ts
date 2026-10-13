import type { DocumentHookRequest } from "../../../libs/hooks/types.js";
import type { RequestDocumentRecord } from "../types.js";

/** Shapes a request for hooks, listing only the proposals and snapshots it has captured. */
const getHookRequest = (request: {
	id: number;
	documents: Array<
		Pick<
			RequestDocumentRecord,
			"collection_key" | "document_id" | "source" | "source_version_id"
		>
	>;
}): DocumentHookRequest => ({
	id: request.id,
	documents: request.documents.flatMap((document) =>
		document.source === null || document.source_version_id === null
			? []
			: [
					{
						collectionKey: document.collection_key,
						documentId: document.document_id,
						source: document.source,
						versionId: document.source_version_id,
					},
				],
	),
});

export default getHookRequest;
