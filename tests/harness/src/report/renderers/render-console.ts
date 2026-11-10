import path from "node:path";
import pc from "picocolors";
import formatDuration from "../../utils/format-duration.ts";
import formatMeasurement from "../../utils/format-measurement.ts";
import formatTable from "../../utils/format-table.ts";
import listFailures from "../list-failures.ts";
import summarizeBySetup from "../summarize-by-setup.ts";
import summarize from "../summarize.ts";
import type { RunReport } from "../types.ts";

const MAX_ERROR_LINES = 8;

/** Keeps an error's message and causes but drops stack frames, so it stays short in a terminal. */
const shorten = (error: string, indent: string): string =>
	error
		.split("\n")
		.filter((line) => line.trim() !== "" && !/^\s+at /.test(line))
		.slice(0, MAX_ERROR_LINES)
		.map((line) => `${indent}${line}`)
		.join("\n");

/**
 * Renders the end-of-run summary for the terminal: what ran, what was measured, then what went
 * wrong. `directory` is the run's folder, which log paths are relative to.
 */
const renderConsole = (report: RunReport, directory: string): string => {
	const lines: string[] = [""];
	const testLanes = report.lanes.filter((lane) => lane.tests.length > 0);
	const measured = report.lanes.filter((lane) => lane.measurements.length > 0);

	if (testLanes.length > 0) {
		lines.push(
			formatTable([
				["SETUP", "LANE", "MODE", "PASSED", "FAILED", "SKIPPED", "N/A", "TIME"],
				...testLanes.map((lane) => {
					const summary = summarize([lane]);
					return [
						lane.setup,
						lane.lane,
						lane.mode,
						String(summary.passed),
						String(summary.failed),
						String(summary.skipped),
						String(summary.notApplicable),
						formatDuration(lane.durationMs),
					];
				}),
			]),
			"",
			//* a setup is judged on the tests that apply to it
			...summarizeBySetup(testLanes).map(
				({ setup, summary }) =>
					`${summary.failed + summary.errors === 0 ? pc.green("✓") : pc.red("✗")} ${setup}: ${summary.passed}/${summary.applicable} applicable tests passed${summary.notApplicable > 0 ? pc.dim(`, ${summary.notApplicable} not applicable`) : ""}`,
			),
			"",
		);
	}

	if (measured.length > 0) {
		lines.push(
			formatTable([
				["SETUP", "MEASUREMENT", "MEDIAN", "SPREAD", "SAMPLES"],
				...measured.flatMap((lane) =>
					lane.measurements.map((measurement) => [
						lane.setup,
						measurement.label,
						formatMeasurement(measurement.value, measurement.unit),
						`±${(measurement.spread * 100).toFixed(1)}%`,
						String(measurement.samples.length),
					]),
				),
			]),
			"",
		);
	}

	for (const failure of listFailures(report)) {
		const { lane } = failure;
		lines.push(
			`${pc.red("✗")} ${lane.setup} ${lane.lane} (${lane.mode}): ${failure.title}`,
			shorten(failure.error, "    "),
		);
		if (lane.log) {
			lines.push(pc.dim(`    Log: ${path.join(directory, lane.log)}`));
		}
	}

	for (const mismatch of report.mismatches) {
		lines.push(
			`${pc.red("≠")} ${mismatch.id} differed between setups with seed ${mismatch.seed}:`,
			...Object.entries(mismatch.digests).map(
				([setup, digest]) => `    ${setup}: ${digest.slice(0, 12)}`,
			),
		);
	}

	for (const id of report.neverRan) {
		lines.push(`${pc.yellow("!")} Applied to no setup in this run: ${id}`);
	}

	const { summary } = report;
	lines.push(
		[
			summary.applicable > 0
				? pc.green(`${summary.passed}/${summary.applicable} passed`)
				: null,
			summary.failed > 0 ? pc.red(`${summary.failed} failed`) : null,
			summary.errors > 0 ? pc.red(`${summary.errors} lane errors`) : null,
			summary.skipped > 0 ? pc.yellow(`${summary.skipped} skipped`) : null,
			summary.flaky > 0 ? pc.yellow(`${summary.flaky} flaky`) : null,
			pc.dim(`in ${formatDuration(report.durationMs)}, seed ${report.seed}`),
		]
			.filter((part) => part !== null)
			.join(pc.dim(" · ")),
	);

	return lines.join("\n");
};

export default renderConsole;
