import { readdir } from "node:fs/promises";
import path from "node:path";
import { readJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import { REPORT_VERSION, type RunReport } from "./types.ts";

/**
 * How many earlier runs to look through. Enough to find each lane's last run, such as the
 * benchmarks after many runs without them, without reading them all.
 */
const LIMIT = 50;

/**
 * Reads recent local reports, newest first, for estimates and comparisons. Skips incomplete,
 * merged and outdated reports.
 */
const loadPreviousReports = async (): Promise<RunReport[]> => {
	const runs = path.join(paths.output, "runs");
	const ids = await readdir(runs).catch((): string[] => []);
	const reports: RunReport[] = [];

	//* run IDs start with their date and time, so names sort oldest to newest
	for (const id of ids
		.filter((name) => /^\d/.test(name))
		.sort()
		.reverse()) {
		if (reports.length === LIMIT) {
			break;
		}
		const report = await readJson<RunReport>(
			path.join(runs, id, "report.json"),
		).catch(() => undefined);
		if (report?.version === REPORT_VERSION) {
			reports.push(report);
		}
	}
	return reports;
};

export default loadPreviousReports;
