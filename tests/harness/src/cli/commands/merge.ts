import path from "node:path";
import buildRunReport from "../../report/build-run-report.ts";
import { REPORT_VERSION, type RunReport } from "../../report/types.ts";
import { readJson } from "../../utils/json.ts";
import { paths } from "../../utils/paths.ts";
import finishRun from "../finish-run.ts";

/** Merges per-setup CI reports into one report for cross-setup comparisons. */
const mergeCommand = async (
	files: string[],
	options: { complete: boolean },
): Promise<number> => {
	if (files.length === 0) {
		throw new Error("Give the report.json files to merge.");
	}

	const reports = await Promise.all(
		files.map((file) => readJson<RunReport>(path.resolve(file))),
	);
	const [first] = reports;
	if (!first) {
		throw new Error("Give the report.json files to merge.");
	}

	if (reports.some((report) => report.version !== REPORT_VERSION)) {
		throw new Error(
			`Every report must be in format ${REPORT_VERSION}. Run them again with this version of the harness.`,
		);
	}

	const runId = `merged-${first.runId}`;
	const merged = buildRunReport({
		runId,
		startedAt: new Date(
			Math.min(...reports.map((report) => Date.parse(report.startedAt))),
		),
		//* the runs happened side by side, so their total is the time spent, not the time waited
		durationMs: reports.reduce((total, report) => total + report.durationMs, 0),
		seed: first.seed,
		lanes: reports.flatMap((report) => report.lanes),
		complete: options.complete,
	});

	return finishRun(merged, {
		directory: path.join(paths.output, "runs", runId),
		//* merged runs come from CI, where there are no earlier local runs to compare with
		previous: [],
	});
};

export default mergeCommand;
