import type { LaneReport, RunReport } from "../report/types.ts";
import compareMeasurements from "./compare-measurements.ts";
import compareTests from "./compare-tests.ts";
import type { Comparison } from "./types.ts";

const laneKey = (lane: LaneReport): string =>
	`${lane.setup} ${lane.lane} (${lane.mode})`;

const identify = (report: RunReport): Comparison["base"] => ({
	runId: report.runId,
	commit: report.git.commit,
	branch: report.git.branch,
	startedAt: report.startedAt,
});

/** Works out what changed between an older run and a newer one. */
const compareReports = (base: RunReport, head: RunReport): Comparison => {
	const baseLanes = new Map(base.lanes.map((lane) => [laneKey(lane), lane]));
	const pairs: Array<{ base: LaneReport; head: LaneReport }> = [];
	const notCompared: string[] = [];

	for (const lane of head.lanes) {
		const match = baseLanes.get(laneKey(lane));
		if (match) {
			pairs.push({ base: match, head: lane });
		} else {
			notCompared.push(laneKey(lane));
		}
	}

	const measurements = compareMeasurements(pairs);
	return {
		base: identify(base),
		head: identify(head),
		tests: compareTests(pairs),
		measurements,
		notCompared,
		blockingRegressions: measurements.filter(
			(measurement) =>
				measurement.verdict === "regression" && measurement.blocking,
		).length,
	};
};

export default compareReports;
