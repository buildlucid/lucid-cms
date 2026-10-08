import {
	RequestDocumentsRepository,
	RequestEventsRepository,
	RequestTargetsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Records target changes on other open or closed requests and clears their affected acknowledgements. */
const recordTargetChange: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			target: string;
			/** Whether the target's version was removed rather than replaced. */
			unpublished?: boolean;
			/** The request making the change. Null for a direct change. */
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
			type: data.unpublished
				? ("target_unpublished" as const)
				: ("target_published" as const),
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

export default recordTargetChange;
