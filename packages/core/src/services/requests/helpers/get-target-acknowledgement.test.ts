import { expect, test } from "vitest";
import getTargetAcknowledgement from "./get-target-acknowledgement.js";

test("only a publish to the same target needs acknowledging, and acknowledgement holds for that version", () => {
	const target = {
		target: "staging",
		acknowledged_at: null,
		acknowledged_version_id: null,
	};
	const events = [
		{
			type: "target_published" as const,
			metadata: { requestDocumentId: 1, target: "production" },
		},
	];
	expect(
		getTargetAcknowledgement({
			requestDocumentId: 1,
			target,
			events,
			currentVersionId: 3,
		}),
	).toEqual({
		changedSinceCreation: false,
		acknowledged: false,
	});

	events.push({
		type: "target_published",
		metadata: { requestDocumentId: 1, target: "staging" },
	});
	const acknowledged = {
		...target,
		acknowledged_at: new Date().toISOString(),
		acknowledged_version_id: 3,
	};
	expect(
		getTargetAcknowledgement({
			requestDocumentId: 1,
			target: acknowledged,
			events,
			currentVersionId: 3,
		}),
	).toEqual({ changedSinceCreation: true, acknowledged: true });
	expect(
		getTargetAcknowledgement({
			requestDocumentId: 1,
			target: acknowledged,
			events,
			currentVersionId: 4,
		}).acknowledged,
	).toBe(false);
});
