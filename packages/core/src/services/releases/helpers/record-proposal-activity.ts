import {
	ReleaseDocumentsRepository,
	ReleaseEventsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Records a change to a proposal, eg. its workflow stage or content, in the
 * activity of the open release that owns it. Consecutive edits by the same
 * person are recorded once, so autosave doesn't flood the activity.
 */
const recordProposalActivity: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId: number;
			userId: number | null;
		} & (
			| { type: "workflow_updated"; stage: string }
			| { type: "proposal_edited" }
		),
	],
	undefined
> = async (context, data) => {
	const ReleaseDocuments = new ReleaseDocumentsRepository(context.db);
	const ReleaseEvents = new ReleaseEventsRepository(context.db);

	const documentRes = await ReleaseDocuments.selectOpenForVersion({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId: data.versionId,
	});
	if (documentRes.error) return documentRes;

	const document = documentRes.data;
	if (!document) return { error: undefined, data: undefined };

	if (data.type === "proposal_edited") {
		const latestRes = await ReleaseEvents.selectMultiple({
			select: ["type", "user_id", "metadata"],
			where: [{ key: "release_id", operator: "=", value: document.release_id }],
			orderBy: [{ column: "id", direction: "desc" }],
			limit: 1,
		});
		if (latestRes.error) return latestRes;

		const latest = latestRes.data?.[0];
		if (
			latest?.type === "proposal_edited" &&
			latest.user_id === data.userId &&
			latest.metadata?.releaseDocumentId === document.id
		) {
			return { error: undefined, data: undefined };
		}
	}

	const eventsRes = await ReleaseEvents.createEvents({
		data: [
			data.type === "workflow_updated"
				? {
						release_id: document.release_id,
						user_id: data.userId,
						type: "workflow_updated",
						metadata: { releaseDocumentId: document.id, stage: data.stage },
					}
				: {
						release_id: document.release_id,
						user_id: data.userId,
						type: "proposal_edited",
						metadata: { releaseDocumentId: document.id },
					},
		],
	});
	if (eventsRes.error) return eventsRes;

	return { error: undefined, data: undefined };
};

export default recordProposalActivity;
