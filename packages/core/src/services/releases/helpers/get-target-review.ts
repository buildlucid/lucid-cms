import type { ReleaseRecord } from "../types.js";

/**
 * A target needs review once someone else publishes to it after the release
 * was created. Acknowledging it holds only for the version it was given
 * against, so another publish asks again.
 */
const getTargetReview = (data: {
	target: Pick<
		ReleaseRecord["documents"][number]["targets"][number],
		"target" | "reviewed_at" | "reviewed_version_id"
	>;
	events: Pick<ReleaseRecord["events"][number], "type" | "metadata">[];
	releaseDocumentId: number;
	currentVersionId: number | null;
}) => ({
	changedSinceCreation: data.events.some(
		(event) =>
			event.type === "target_published" &&
			event.metadata?.releaseDocumentId === data.releaseDocumentId &&
			event.metadata?.target === data.target.target,
	),
	reviewed:
		data.target.reviewed_at !== null &&
		data.target.reviewed_version_id === data.currentVersionId,
});

export default getTargetReview;
