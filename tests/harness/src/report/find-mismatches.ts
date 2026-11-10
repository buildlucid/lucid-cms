import type { DifferentialMismatch, LaneReport } from "./types.ts";

/**
 * Finds cross-setup simulation digest differences for the same seed, indicating database or
 * runtime differences.
 */
const findMismatches = (
	lanes: readonly LaneReport[],
): DifferentialMismatch[] => {
	//* keyed by test and seed, as only runs with the same seed made the same choices
	const digests = new Map<
		string,
		{ id: string; seed: number; bySetup: Record<string, string> }
	>();

	for (const lane of lanes) {
		for (const test of lane.tests) {
			const digest = test.meta?.digest;
			const seed = test.meta?.seed;
			if (
				test.status !== "passed" ||
				typeof digest !== "string" ||
				typeof seed !== "number"
			) {
				continue;
			}

			const key = `${test.id}@${seed}`;
			const entry = digests.get(key) ?? { id: test.id, seed, bySetup: {} };
			entry.bySetup[`${lane.setup} (${lane.mode})`] = digest;
			digests.set(key, entry);
		}
	}

	return [...digests.values()]
		.filter((entry) => new Set(Object.values(entry.bySetup)).size > 1)
		.map((entry) => ({
			id: entry.id,
			seed: entry.seed,
			digests: entry.bySetup,
		}));
};

export default findMismatches;
