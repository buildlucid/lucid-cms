import {
	RequestDocumentsRepository,
	RequestEventsRepository,
	RequestTargetsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Called after something publishes to an environment or changes latest. Every
 * other open or closed request for the document records environment publishes
 * in its activity, while latest changes are only recorded by requests that
 * target latest. Requests targeting the changed version ask for a review
 * before approval, and any earlier acknowledgement is cleared, as latest can
 * change without a new version. Closed requests are included so the review is
 * still asked for once they reopen.
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
	const RequestTargets = new RequestTargetsRepository(context.db);

	const documentsRes = await RequestDocuments.selectIncompleteForDocument({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		target: data.target === "latest" ? "latest" : undefined,
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

	const reviewsRes = await RequestTargets.updateMultiple({
		data: { reviewed_version_id: null, reviewed_by: null, reviewed_at: null },
		where: [
			{
				key: "request_document_id",
				operator: "in",
				value: documents.map((document) => document.id),
			},
			{ key: "target", operator: "=", value: data.target },
		],
	});
	if (reviewsRes.error) return reviewsRes;

	return { error: undefined, data: undefined };
};

export default recordTargetPublished;
