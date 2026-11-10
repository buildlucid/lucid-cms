import type { LaneReport, TestRecord } from "../report/types.ts";
import type { Comparison, TestChange } from "./types.ts";

/** A test counts as slower when it takes this many times longer, and at least this much longer. */
const SLOWER_FACTOR = 2;
const SLOWER_MIN_MS = 500;

/** Compares test results between lane runs that both runs have, given as base and head pairs. */
const compareTests = (
	pairs: ReadonlyArray<{ base: LaneReport; head: LaneReport }>,
): Comparison["tests"] => {
	const result: Comparison["tests"] = {
		newlyFailing: [],
		fixed: [],
		newlyNotApplicable: [],
		added: [],
		removed: [],
		slower: [],
	};
	const baseIds = new Set<string>();
	const headIds = new Set<string>();

	for (const { base, head } of pairs) {
		const before = new Map(base.tests.map((test) => [test.id, test]));
		const where = { setup: head.setup, mode: head.mode };
		const change = (test: TestRecord, detail?: string): TestChange => ({
			id: test.id,
			...where,
			base: before.get(test.id)?.status ?? null,
			head: test.status,
			detail,
		});

		for (const test of base.tests) {
			baseIds.add(test.id);
		}

		for (const test of head.tests) {
			headIds.add(test.id);
			const previous = before.get(test.id);

			if (test.status === "failed" && previous?.status !== "failed") {
				result.newlyFailing.push(change(test, test.errors[0]));
			}
			if (test.status === "passed" && previous?.status === "failed") {
				result.fixed.push(change(test));
			}
			if (
				test.status === "notApplicable" &&
				previous &&
				previous.status !== "notApplicable"
			) {
				result.newlyNotApplicable.push(change(test, test.skipReason));
			}
			if (
				test.status === "passed" &&
				previous?.status === "passed" &&
				test.durationMs > previous.durationMs * SLOWER_FACTOR &&
				test.durationMs - previous.durationMs > SLOWER_MIN_MS
			) {
				result.slower.push({
					id: test.id,
					...where,
					baseMs: previous.durationMs,
					headMs: test.durationMs,
				});
			}
		}
	}

	result.added = [...headIds].filter((id) => !baseIds.has(id)).sort();
	result.removed = [...baseIds].filter((id) => !headIds.has(id)).sort();
	return result;
};

export default compareTests;
