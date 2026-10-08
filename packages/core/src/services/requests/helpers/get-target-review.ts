import type { RequestRecord } from "../types.js";

/** Reports target changes since request creation and whether the current version has been acknowledged. */
const getTargetReview = (data: {
	target: Pick<
		RequestRecord["documents"][number]["targets"][number],
		"target" | "reviewed_at" | "reviewed_version_id"
	>;
	events: Pick<RequestRecord["events"][number], "type" | "metadata">[];
	requestDocumentId: number;
	currentVersionId: number | null;
}) => ({
	changedSinceCreation: data.events.some(
		(event) =>
			(event.type === "target_published" ||
				event.type === "target_unpublished") &&
			event.metadata?.requestDocumentId === data.requestDocumentId &&
			event.metadata?.target === data.target.target,
	),
	reviewed:
		data.target.reviewed_at !== null &&
		data.target.reviewed_version_id === data.currentVersionId,
});

export default getTargetReview;
