import pc from "picocolors";
import createRerunCommand from "../report/create-rerun-command.ts";
import shortenError from "../report/shorten-error.ts";
import describeTest from "../utils/describe-test.ts";
import formatDuration from "../utils/format-duration.ts";
import formatLane from "./format-lane.ts";
import type { JobState, RunNote, RunState } from "./types.ts";

const INDENT = "    ";

/** What a finished lane's results came to, such as `71 passed · 3 n/a`. */
const describeResult = (job: JobState): string => {
	const { result } = job;
	if (!result) {
		return "";
	}
	const { summary } = result;
	return [
		summary.failed > 0 ? pc.red(`${summary.failed} failed`) : null,
		summary.applicable > 0 ? `${summary.passed} passed` : null,
		summary.skipped > 0 ? pc.yellow(`${summary.skipped} skipped`) : null,
		summary.notApplicable > 0 ? pc.dim(`${summary.notApplicable} n/a`) : null,
		result.measurements > 0 ? `${result.measurements} measurements` : null,
		result.errors.length > 0
			? pc.red(
					`${result.errors.length} error${result.errors.length > 1 ? "s" : ""}`,
				)
			: null,
	]
		.filter((part) => part !== null)
		.join(pc.dim(" · "));
};

/**
 * Formats lane results, test failures with rerun commands, warnings and run steps for both live
 * and plain output.
 */
const formatNote = (note: RunNote, state: RunState): string[] => {
	switch (note.type) {
		case "phase": {
			return [pc.dim(`· ${note.message}`)];
		}
		case "warning": {
			return [pc.yellow(`! ${note.message}`)];
		}
		case "stopping": {
			return [
				pc.yellow(
					"■ Stopping: ending lanes and removing their databases and servers. Press Ctrl+C again to quit at once.",
				),
			];
		}
		case "job-end": {
			const { job } = note;
			return [
				formatLane({
					job,
					columns: state.columns,
					icon: job.status === "failed" ? pc.red("✗") : pc.green("✓"),
					detail: describeResult(job),
					time:
						job.startedAt === undefined
							? undefined
							: formatDuration(
									(job.finishedAt ?? job.startedAt) - job.startedAt,
								),
				}),
				...(job.result?.errors ?? []).map(
					(error) => `${INDENT}${pc.red(error)}`,
				),
			];
		}
		case "test-failed": {
			const { job, test } = note;
			const names = test.name.split(" > ");
			return [
				formatLane({
					job,
					columns: state.columns,
					icon: pc.red("✗"),
					detail: describeTest(test.file, names),
				}),
				...shortenError(test.error ?? "").map(
					(line) => `${INDENT}${pc.red(line)}`,
				),
				`${INDENT}${pc.dim("Again")}  ${createRerunCommand(job, { file: test.file, name: names.at(-1) ?? test.name })}`,
			];
		}
	}
};

export default formatNote;
