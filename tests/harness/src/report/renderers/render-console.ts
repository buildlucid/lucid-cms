import path from "node:path";
import pc from "picocolors";
import stringWidth from "string-width";
import compareMeasurements from "../../compare/compare-measurements.ts";
import type { MeasurementChange } from "../../compare/types.ts";
import registeredLanes from "../../lanes/get-lanes.ts";
import { MODES } from "../../setup/types.ts";
import createJobKey from "../../utils/create-job-key.ts";
import formatDuration from "../../utils/format-duration.ts";
import formatMeasurement from "../../utils/format-measurement.ts";
import formatTable from "../../utils/format-table.ts";
import createRerunCommand from "../create-rerun-command.ts";
import findPreviousLane from "../find-previous-lane.ts";
import groupMeasurements from "../group-measurements.ts";
import listFailures from "../list-failures.ts";
import summarizeBySetup from "../summarize-by-setup.ts";
import summarize from "../summarize.ts";
import type { LaneReport, RunReport, TestRecord } from "../types.ts";

const MAX_ERROR_LINES = 6;
const SLOWEST = 5;

type Options = {
	/** The run's folder, which log paths are relative to. */
	directory: string;
	/** Earlier reports, newest first, to say what changed since the last run. */
	previous: readonly RunReport[];
	/** The terminal's width. */
	width: number;
};

const heading = (text: string) => pc.bold(text.toUpperCase());

/** Keeps an error's message and causes but drops stack frames, so it stays short in a terminal. */
const shorten = (error: string, indent: string): string[] =>
	error
		.split("\n")
		.filter((line) => line.trim() !== "" && !/^\s+at /.test(line))
		.slice(0, MAX_ERROR_LINES)
		.map((line) => `${indent}${line}`);

/** A test's file and full name as people read them. */
const describeTest = (test: TestRecord) =>
	[test.file, ...test.groups, test.name].join(" › ");

/** Turns a path into a link the terminal can open, where the terminal supports them. */
const link = (file: string): string =>
	process.stdout.isTTY
		? `\u001B]8;;file://${file}\u0007${file}\u001B]8;;\u0007`
		: file;

/** The first line: whether the run passed, and the counts behind that. */
const renderVerdict = (report: RunReport): string => {
	const { summary } = report;
	const failed =
		summary.failed > 0 || summary.errors > 0 || report.mismatches.length > 0;
	const problems = [
		summary.failed > 0 ? `${summary.failed} failed` : null,
		summary.errors > 0
			? `${summary.errors} lane error${summary.errors > 1 ? "s" : ""}`
			: null,
		report.mismatches.length > 0
			? `${report.mismatches.length} setups disagreed`
			: null,
	].filter((part) => part !== null);
	const counts = [
		summary.applicable > 0
			? `${summary.passed} of ${summary.applicable} passed`
			: null,
		summary.skipped > 0 ? pc.yellow(`${summary.skipped} skipped`) : null,
		summary.flaky > 0 ? pc.yellow(`${summary.flaky} flaky`) : null,
		summary.notApplicable > 0 ? pc.dim(`${summary.notApplicable} n/a`) : null,
	].filter((part) => part !== null);

	const verdict = report.stopped
		? pc.yellow(pc.bold("■ Stopped before it finished"))
		: failed
			? pc.red(pc.bold(`✗ ${problems.join(" · ")}`))
			: pc.green(pc.bold("✓ Passed"));
	return [
		verdict,
		...(report.stopped && problems.length > 0
			? [pc.red(problems.join(" · "))]
			: []),
		...counts,
		pc.dim(`${formatDuration(report.durationMs)} · seed ${report.seed}`),
	].join(pc.dim(" · "));
};

/** Each failure with its error, its log and the command that runs it again. */
const renderFailures = (report: RunReport, directory: string): string[] => {
	//* in a cancelled run, lanes that had not finished only say they were stopped, as the verdict does
	const failures = listFailures(report).filter(
		(failure) => !report.stopped || failure.test,
	);
	if (failures.length === 0) {
		return [];
	}

	const lines = ["", heading(`Failed (${failures.length})`)];
	for (const failure of failures) {
		const { lane, test } = failure;
		lines.push(
			"",
			`${pc.red("✗")} ${pc.bold(`${lane.setup} ${lane.lane} ${lane.mode}`)}${test ? ` ${describeTest(test)}` : pc.dim(" outside any test")}`,
			...shorten(failure.error, "    ").map((line) => pc.red(line)),
		);
		if (lane.log) {
			lines.push(
				`  ${pc.dim("Log  ")}  ${link(path.join(directory, lane.log))}`,
			);
		}
		lines.push(`  ${pc.dim("Again")}  ${createRerunCommand(failure)}`);
	}
	return lines;
};

/** One cell of the setup table: how a lane run went. */
const renderLaneCell = (lane: LaneReport | undefined): string => {
	if (!lane) {
		return pc.dim("–");
	}
	const summary = summarize([lane]);
	const time = pc.dim(formatDuration(lane.durationMs));
	if (summary.failed > 0) {
		return `${pc.red(`✗ ${summary.failed} of ${summary.applicable}`)} ${time}`;
	}
	if (lane.errors.length > 0) {
		return `${pc.red("✗ error")} ${time}`;
	}
	if (summary.applicable === 0 && lane.measurements.length > 0) {
		return `${pc.green("✓")} ${lane.measurements.length} measured ${time}`;
	}
	return `${pc.green(`✓ ${summary.passed}`)} ${time}`;
};

/** A table with a row per setup and a column per lane run, or a list when it is too wide. */
const renderSetups = (report: RunReport, width: number): string[] => {
	//* in the order lanes are registered, then by mode, so every report lines up the same
	const order = (lane: LaneReport) =>
		registeredLanes.findIndex((candidate) => candidate.key === lane.lane) *
			MODES.length +
		MODES.indexOf(lane.mode);
	const columns = [
		...new Set(
			report.lanes
				.toSorted((a, b) => order(a) - order(b))
				.map((lane) => `${lane.lane} ${lane.mode}`),
		),
	];
	const rows = summarizeBySetup(report.lanes).map(({ setup, summary }) => {
		const failed = summary.failed + summary.errors > 0;
		const lanes = report.lanes.filter((lane) => lane.setup === setup);
		return {
			setup: `${failed ? pc.red("✗") : pc.green("✓")} ${setup}`,
			total:
				summary.applicable > 0
					? `${summary.passed}/${summary.applicable}${summary.notApplicable > 0 ? pc.dim(` +${summary.notApplicable} n/a`) : ""}`
					: "",
			cells: columns.map((column) =>
				renderLaneCell(
					lanes.find((lane) => `${lane.lane} ${lane.mode}` === column),
				),
			),
		};
	});

	const table = formatTable([
		[
			heading("Setup"),
			heading("Passed"),
			...columns.map((column) => pc.dim(column)),
		],
		...rows.map((row) => [row.setup, row.total, ...row.cells]),
	]);
	if (
		Math.max(...table.split("\n").map((line) => stringWidth(line))) <= width
	) {
		return ["", table];
	}

	return [
		"",
		heading("Setups"),
		...rows.flatMap((row) => [
			`${row.setup}  ${row.total}`,
			...columns.map(
				(column, index) =>
					`    ${pc.dim(column.padEnd(20))} ${row.cells[index]}`,
			),
		]),
	];
};

/** A change since the last run, when it counts: ▲ for worse, ▼ for better. */
const renderChange = (change: MeasurementChange | undefined): string => {
	if (!change || change.change === null) {
		return "";
	}
	const percent = `${Math.round(Math.abs(change.change) * 100)}%`;
	if (change.verdict === "regression") {
		return (change.blocking ? pc.red : pc.yellow)(` ▲${percent}`);
	}
	if (change.verdict === "improvement") {
		return pc.green(` ▼${percent}`);
	}
	return "";
};

/**
 * A table with a row per measurement and a column per setup. A timing's query count shares its
 * cell, and each value is marked when it changed since the last run beyond its tolerance.
 */
const renderMeasurements = (
	report: RunReport,
	previous: readonly RunReport[],
): string[] => {
	const measured = report.lanes.filter((lane) => lane.measurements.length > 0);
	if (measured.length === 0) {
		return [];
	}

	const changes = new Map(
		compareMeasurements(
			measured.flatMap((head) => {
				const base = findPreviousLane(previous, createJobKey(head));
				return base ? [{ base, head }] : [];
			}),
		).map((change) => [`${change.setup}/${change.id}`, change]),
	);
	const groups = new Map(
		measured.map((lane) => [lane.setup, groupMeasurements(lane.measurements)]),
	);
	const ids = [
		...new Map(
			[...groups.values()].flat().map((group) => [group.id, group.label]),
		),
	];

	const cell = (setup: string, id: string): string => {
		const group = groups.get(setup)?.find((candidate) => candidate.id === id);
		if (!group) {
			return pc.dim("–");
		}
		const { value, queries } = group;
		return [
			`${formatMeasurement(value.value, value.unit)}${renderChange(changes.get(`${setup}/${id}`))}`,
			queries
				? pc.dim(`${queries.value}q`) +
					renderChange(changes.get(`${setup}/${queries.id}`))
				: null,
		]
			.filter((part) => part !== null)
			.join(pc.dim(" · "));
	};

	return [
		"",
		formatTable([
			[heading("Measurement"), ...measured.map((lane) => pc.dim(lane.setup))],
			...ids.map(([id, label]) => [
				label,
				...measured.map((lane) => cell(lane.setup, id)),
			]),
		]),
		pc.dim(
			"Medians. q is database queries. ▲▼ mark changes since the last run beyond each tolerance. 95th percentiles are in the HTML report.",
		),
	];
};

/** The slowest tests, with how much they changed since the last run. */
const renderSlowest = (
	report: RunReport,
	previous: readonly RunReport[],
): string[] => {
	const tests = report.lanes
		.flatMap((lane) =>
			lane.tests
				.filter((test) => test.status === "passed" || test.status === "failed")
				.map((test) => ({ lane, test })),
		)
		.sort((a, b) => b.test.durationMs - a.test.durationMs)
		.slice(0, SLOWEST);
	if (tests.length === 0) {
		return [];
	}

	return [
		"",
		heading("Slowest tests"),
		...tests.map(({ lane, test }) => {
			const before = findPreviousLane(previous, createJobKey(lane))?.tests.find(
				(candidate) => candidate.id === test.id,
			);
			const change = before ? test.durationMs - before.durationMs : 0;
			const changed =
				before &&
				Math.abs(change) >= 1000 &&
				Math.abs(change) >= before.durationMs * 0.2
					? (change > 0 ? pc.yellow : pc.green)(
							`  ${change > 0 ? "+" : "−"}${formatDuration(Math.abs(change))} vs last run`,
						)
					: "";
			return `${formatDuration(test.durationMs).padStart(7)}  ${pc.dim(`${lane.setup} ${lane.lane} ${lane.mode}`)}  ${describeTest(test)}${changed}`;
		}),
	];
};

/**
 * Renders the end-of-run report for the terminal: the verdict first, then what failed and how
 * to run it again, each setup's lanes, measurements and the slowest tests.
 */
const renderConsole = (report: RunReport, options: Options): string => {
	const lines = [
		"",
		renderVerdict(report),
		...renderFailures(report, options.directory),
		...renderSetups(report, options.width),
		...renderMeasurements(report, options.previous),
		...renderSlowest(report, options.previous),
	];

	if (report.mismatches.length > 0) {
		lines.push("", heading("Setups that disagreed"));
		for (const mismatch of report.mismatches) {
			lines.push(
				`${pc.red("≠")} ${mismatch.id} ${pc.dim(`seed ${mismatch.seed}`)}`,
				...Object.entries(mismatch.digests).map(
					([setup, digest]) => `    ${setup}: ${digest.slice(0, 12)}`,
				),
			);
		}
	}
	if (report.neverRan.length > 0) {
		lines.push("", heading("Applied to no setup"));
		for (const id of report.neverRan) {
			lines.push(`${pc.yellow("!")} ${id}`);
		}
	}

	lines.push(
		"",
		`${pc.dim("Report")}  ${link(path.join(options.directory, "report.html"))}`,
	);
	if (listFailures(report).length > 0) {
		lines.push(`${pc.dim("Again ")}  npm run harness -- --failed`);
	}
	return lines.join("\n");
};

export default renderConsole;
