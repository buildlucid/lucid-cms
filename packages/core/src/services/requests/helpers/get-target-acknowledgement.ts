import type { RequestRecord } from "../types.js";

/** Reports target changes since request creation and acknowledgement of the current version. */
const getTargetAcknowledgement = (data: {
	target: Pick<
		RequestRecord["documents"][number]["targets"][number],
		"target" | "acknowledged_at" | "acknowledged_version_id"
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
	acknowledged:
		data.target.acknowledged_at !== null &&
		data.target.acknowledged_version_id === data.currentVersionId,
});

export default getTargetAcknowledgement;
