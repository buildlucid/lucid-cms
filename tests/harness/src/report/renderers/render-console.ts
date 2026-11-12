import path from "node:path";
import pc from "picocolors";
import stringWidth from "string-width";
import registeredLanes from "../../lanes/get-lanes.ts";
import { MODES } from "../../setup/types.ts";
import describeTest from "../../utils/describe-test.ts";
import formatDuration from "../../utils/format-duration.ts";
import formatMeasurement from "../../utils/format-measurement.ts";
import formatTable from "../../utils/format-table.ts";
import createRerunCommand from "../create-rerun-command.ts";
import groupMeasurements from "../group-measurements.ts";
import listFailures from "../list-failures.ts";
import shortenError from "../shorten-error.ts";
import summarizeBySetup from "../summarize-by-setup.ts";
import summarize from "../summarize.ts";
import type { History, LaneReport, Measurement, RunReport } from "../types.ts";

const SLOWEST = 5;

type Options = {
	/** The run's folder, which log paths are relative to. */
	directory: string;
	/** What earlier runs measured, shown beside this run's measurements. */
	history?: History;
	/** The terminal's width. */
	width: number;
};

const heading = (text: string) => pc.bold(text.toUpperCase());

/** Turns a path into a link the terminal can open, where the terminal supports them. */
const link = (file: string): string =>
	process.stdout.isTTY
		? `\u001B]8;;file://${file}\u0007${file}\u001B]8;;\u0007`
		: file;

/** The first line: whether the run passed, and the counts behind that. */
const renderVerdict = (report: RunReport): string => {
	const { summary } = report;
	const failed = summary.failed > 0 || summary.errors > 0;
	const problems = [
		summary.failed > 0 ? `${summary.failed} failed` : null,
		summary.errors > 0
			? `${summary.errors} lane error${summary.errors > 1 ? "s" : ""}`
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
			`${pc.red("✗")} ${pc.bold(`${lane.setup} ${lane.lane} ${lane.mode}`)}${test ? ` ${describeTest(test.file, [...test.groups, test.name])}` : pc.dim(" outside any test")}`,
			...shortenError(failure.error).map((line) => `    ${pc.red(line)}`),
		);
		if (lane.log) {
			lines.push(
				`  ${pc.dim("Log  ")}  ${link(path.join(directory, lane.log))}`,
			);
		}
		lines.push(`  ${pc.dim("Again")}  ${createRerunCommand(lane, test)}`);
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

/** A measured value, with the last run's beside it when there was one. */
const describeValue = (
	measurement: Measurement,
	previous: number | undefined,
	format: (value: number) => string,
): string =>
	`${format(measurement.value)}${previous === undefined ? "" : pc.dim(` (was ${format(previous)})`)}`;

/**
 * A table with a row per measurement and a column per setup. A timing's query count shares its
 * cell, and each value has the last run's beside it.
 */
const renderMeasurements = (
	report: RunReport,
	history: History | undefined,
): string[] => {
	const measured = report.lanes.filter((lane) => lane.measurements.length > 0);
	if (measured.length === 0) {
		return [];
	}

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
		const previous = history?.measurements[setup];
		return [
			describeValue(value, previous?.[value.id], (number) =>
				formatMeasurement(number, value.unit),
			),
			queries
				? describeValue(queries, previous?.[queries.id], (number) =>
						pc.dim(`${number}q`),
					)
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
			"Medians. q is database queries. 95th percentiles and spread are in summary.md.",
		),
	];
};

/** The slowest tests in the run. */
const renderSlowest = (report: RunReport): string[] => {
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
		...tests.map(
			({ lane, test }) =>
				`${formatDuration(test.durationMs).padStart(7)}  ${pc.dim(`${lane.setup} ${lane.lane} ${lane.mode}`)}  ${describeTest(test.file, [...test.groups, test.name])}`,
		),
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
		...renderMeasurements(report, options.history),
		...renderSlowest(report),
	];

	if (report.neverRan.length > 0) {
		lines.push("", heading("Applied to no setup"));
		for (const id of report.neverRan) {
			lines.push(`${pc.yellow("!")} ${id}`);
		}
	}

	lines.push("", `${pc.dim("Run   ")}  ${link(options.directory)}`);
	if (listFailures(report).length > 0) {
		lines.push(`${pc.dim("Again ")}  npm run harness -- --failed`);
	}
	return lines.join("\n");
};

export default renderConsole;
