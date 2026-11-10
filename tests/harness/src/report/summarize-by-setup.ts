import summarize from "./summarize.ts";
import type { LaneReport, RunSummary } from "./types.ts";

/** Counts test results for each setup, in setup name order. */
const summarizeBySetup = (
	lanes: readonly LaneReport[],
): Array<{ setup: string; summary: RunSummary }> =>
	[...new Set(lanes.map((lane) => lane.setup))].sort().map((setup) => ({
		setup,
		summary: summarize(lanes.filter((lane) => lane.setup === setup)),
	}));

export default summarizeBySetup;
