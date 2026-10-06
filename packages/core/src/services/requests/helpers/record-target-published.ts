import {
	RequestDocumentsRepository,
	RequestEventsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Called after something publishes to an environment. Every other open or
 * closed request for the document records it in its activity, and requests
 * targeting that environment ask for a review before approval. Closed requests
 * are included so the review is still asked for once they reopen.
 */
const recordTargetPublished: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			target: string;
			/** The request doing the publishing. Null for a direct publish. */
			requestId?: number;
			userId: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const documentsRes = await RequestDocuments.selectIncompleteForDocument({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
	});
	if (documentsRes.error) return documentsRes;

	const documents = documentsRes.data.filter(
		(document) => document.request_id !== data.requestId,
	);
	if (documents.length === 0) return { error: undefined, data: undefined };

	const eventsRes = await RequestEvents.createEvents({
		data: documents.map((document) => ({
			request_id: document.request_id,
			user_id: data.userId,
			type: "target_published" as const,
			metadata: {
				target: data.target,
				requestDocumentId: document.id,
				sourceRequestId: data.requestId ?? null,
			},
		})),
	});
	if (eventsRes.error) return eventsRes;

	return { error: undefined, data: undefined };
};

export default recordTargetPublished;
