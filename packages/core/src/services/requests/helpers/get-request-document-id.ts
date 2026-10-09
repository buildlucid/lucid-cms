import { copy } from "../../../libs/i18n/index.js";
import type { LucidActor } from "../../../types/hono.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import loadRequest from "./load-request.js";

/** Finds a document's place in a request the user can read, for callers that address documents by collection and ID. */
const getRequestDocumentId: ServiceFn<
	[{ id: number; user: LucidActor; collectionKey: string; documentId: number }],
	number
> = async (context, data) => {
	const requestRes = await loadRequest(context, data);
	if (requestRes.error) return requestRes;

	const document = requestRes.data.documents.find(
		(document) =>
			document.collection_key === data.collectionKey &&
			document.document_id === data.documentId,
	);
	if (!document) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.requests.document.not.found"),
				status: 404,
			},
			data: undefined,
		};
	}

	return { error: undefined, data: document.id };
};

export default getRequestDocumentId;
