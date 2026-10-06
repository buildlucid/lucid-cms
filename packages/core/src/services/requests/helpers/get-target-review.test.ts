import { expect, test } from "vitest";
import getTargetReview from "./get-target-review.js";

test("only a publish to the same target needs review, and acknowledgement holds for that version", () => {
	const target = {
		target: "staging",
		reviewed_at: null,
		reviewed_version_id: null,
	};
	const events = [
		{
			type: "target_published" as const,
			metadata: { requestDocumentId: 1, target: "production" },
		},
	];
	expect(
		getTargetReview({
			requestDocumentId: 1,
			target,
			events,
			currentVersionId: 3,
		}),
	).toEqual({
		changedSinceCreation: false,
		reviewed: false,
	});

	events.push({
		type: "target_published",
		metadata: { requestDocumentId: 1, target: "staging" },
	});
	const reviewed = {
		...target,
		reviewed_at: new Date().toISOString(),
		reviewed_version_id: 3,
	};
	expect(
		getTargetReview({
			requestDocumentId: 1,
			target: reviewed,
			events,
			currentVersionId: 3,
		}),
	).toEqual({ changedSinceCreation: true, reviewed: true });
	expect(
		getTargetReview({
			requestDocumentId: 1,
			target: reviewed,
			events,
			currentVersionId: 4,
		}).reviewed,
	).toBe(false);
});
