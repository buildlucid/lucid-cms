import type { LaneReport } from "./types.ts";

/**
 * Lists tests that did not apply to any setup in a run. Across every setup that means nothing
 * covers them, usually because a `requires()` names a capability no setup has.
 */
const findNeverRan = (lanes: readonly LaneReport[]): string[] => {
	const applied = new Map<string, boolean>();

	for (const lane of lanes) {
		for (const test of lane.tests) {
			applied.set(
				test.id,
				(applied.get(test.id) ?? false) || test.status !== "notApplicable",
			);
		}
	}

	return [...applied]
		.filter(([, ran]) => !ran)
		.map(([id]) => id)
		.sort();
};

export default findNeverRan;
