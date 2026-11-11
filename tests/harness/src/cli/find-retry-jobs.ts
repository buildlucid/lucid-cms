import path from "node:path";
import type { RunReport, TestRecord } from "../report/types.ts";
import escapePattern from "../utils/escape-pattern.ts";
import { readJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import type { RetryJob } from "./types.ts";

/**
 * The pattern that picks out one test by its describe blocks and name. Vitest joins them with
 * ` > ` and Playwright with spaces, so it matches either.
 */
const toTestPattern = (test: TestRecord): string =>
	[...test.groups, test.name].map(escapePattern).join(" (?:> )?");

/**
 * Lists what failed in the latest run, for `--failed`. A lane run with a failure outside any
 * test runs again in full. Otherwise only its failed tests run.
 */
const findRetryJobs = async (): Promise<RetryJob[]> => {
	const file = path.join(paths.output, "latest", "report.json");
	const report = await readJson<RunReport>(file).catch(() => {
		throw new Error(`There is no earlier run to retry. Looked for ${file}.`);
	});

	return report.lanes.flatMap((lane): RetryJob[] => {
		const failed = lane.tests.filter((test) => test.status === "failed");
		if (lane.errors.length === 0 && failed.length === 0) {
			return [];
		}

		const job = { setup: lane.setup, lane: lane.lane, mode: lane.mode };
		if (lane.errors.length > 0) {
			return [{ ...job, filters: { files: [], tests: [] } }];
		}
		return [
			{
				...job,
				filters: {
					files: [...new Set(failed.map((test) => test.file))],
					tests: failed.map(toTestPattern),
				},
			},
		];
	});
};

export default findRetryJobs;
