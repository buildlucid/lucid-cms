import type { LaneResult, RunSummary } from "./types.ts";

/** Counts test results across lane runs. */
const summarize = (lanes: readonly LaneResult[]): RunSummary => {
	const summary: RunSummary = {
		passed: 0,
		failed: 0,
		skipped: 0,
		notApplicable: 0,
		applicable: 0,
		errors: 0,
		flaky: 0,
	};

	for (const lane of lanes) {
		if (lane.errors.length > 0) {
			summary.errors++;
		}
		for (const test of lane.tests) {
			summary[test.status]++;
			if (test.status !== "notApplicable") {
				summary.applicable++;
			}
			if (test.flaky) {
				summary.flaky++;
			}
		}
	}

	return summary;
};

export default summarize;
