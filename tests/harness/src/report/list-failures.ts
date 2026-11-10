import type { LaneReport, RunReport } from "./types.ts";

export type Failure = {
	lane: LaneReport;
	/** The failed test's ID, or a label for a failure outside any test. */
	title: string;
	error: string;
};

/** Lists everything that failed in a run: lane errors first, then failed tests. */
const listFailures = (report: RunReport): Failure[] =>
	report.lanes.flatMap((lane) => [
		...lane.errors.map((error) => ({ lane, title: "Lane error", error })),
		...lane.tests
			.filter((test) => test.status === "failed")
			.map((test) => ({
				lane,
				title: test.id,
				error: test.errors.join("\n\n"),
			})),
	]);

export default listFailures;
