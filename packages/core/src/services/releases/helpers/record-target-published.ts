import {
	ReleaseDocumentsRepository,
	ReleaseEventsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Called after something publishes to an environment. Every other open or
 * closed release for the document records it in its activity, and releases
 * targeting that environment ask for a review before approval. Closed releases
 * are included so the review is still asked for once they reopen.
 */
const recordTargetPublished: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			target: string;
			/** The release doing the publishing. Null for a direct publish. */
			releaseId?: number;
			userId: number | null;
		},
	],
	undefined
> = async (context, data) => {
	const ReleaseDocuments = new ReleaseDocumentsRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const documentsRes = await ReleaseDocuments.selectUnreleasedForDocument({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
	});
	if (documentsRes.error) return documentsRes;

	const documents = documentsRes.data.filter(
		(document) => document.release_id !== data.releaseId,
	);
	if (documents.length === 0) return { error: undefined, data: undefined };

	const eventsRes = await ReleaseEvents.createEvents({
		data: documents.map((document) => ({
			release_id: document.release_id,
			user_id: data.userId,
			type: "target_published" as const,
			metadata: {
				target: data.target,
				releaseDocumentId: document.id,
				sourceReleaseId: data.releaseId ?? null,
			},
		})),
	});
	if (eventsRes.error) return eventsRes;

	return { error: undefined, data: undefined };
};

export default recordTargetPublished;
