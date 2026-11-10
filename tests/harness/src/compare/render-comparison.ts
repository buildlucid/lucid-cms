import formatDuration from "../utils/format-duration.ts";
import formatMeasurement from "../utils/format-measurement.ts";
import type { Comparison, MeasurementChange, TestChange } from "./types.ts";

const VERDICTS = {
	regression: "🔴 slower or larger",
	improvement: "🟢 faster or smaller",
	unchanged: "No real change",
	new: "New",
} as const satisfies Record<MeasurementChange["verdict"], string>;

const formatChange = (change: number | null): string =>
	change === null
		? "–"
		: `${change > 0 ? "+" : ""}${(change * 100).toFixed(1)}%`;

const renderTable = (measurements: MeasurementChange[]): string[] => [
	"| Setup | Measurement | Base | Head | Change | Needed to count | Verdict |",
	"| --- | --- | ---: | ---: | ---: | ---: | --- |",
	...measurements.map(
		(m) =>
			`| ${m.setup} | ${m.label} | ${m.base === null ? "–" : formatMeasurement(m.base, m.unit)} | ${formatMeasurement(m.head, m.unit)} | ${formatChange(m.change)} | ±${(m.threshold * 100).toFixed(1)}% | ${VERDICTS[m.verdict]}${m.verdict === "regression" && m.blocking ? " (blocking)" : ""} |`,
	),
];

const describeRun = (run: Comparison["base"]): string =>
	`\`${run.commit?.slice(0, 9) ?? "unknown"}\` on \`${run.branch ?? "unknown"}\``;

const listChanges = (title: string, changes: TestChange[]): string[] =>
	changes.length === 0
		? []
		: [
				`**${title} (${changes.length})**`,
				"",
				...changes.map(
					(change) =>
						`- \`${change.setup} (${change.mode})\` ${change.id}${change.detail ? `: ${change.detail.split("\n")[0]}` : ""}`,
				),
				"",
			];

const listIds = (title: string, ids: string[]): string[] =>
	ids.length === 0
		? []
		: [`**${title} (${ids.length})**`, "", ...ids.map((id) => `- ${id}`), ""];

/** Renders test and performance comparisons as Markdown for pull request review. */
const renderComparison = (comparison: Comparison): string => {
	const { tests, measurements } = comparison;
	const regressions = measurements.filter(
		(measurement) => measurement.verdict === "regression",
	);
	const changed = [
		...regressions,
		...measurements.filter((m) => m.verdict === "improvement"),
		...measurements.filter((m) => m.verdict === "new"),
	];
	const unchanged = measurements.filter((m) => m.verdict === "unchanged");

	const lines = [
		"## Compared with the previous run",
		"",
		`Base ${describeRun(comparison.base)} · head ${describeRun(comparison.head)}`,
		"",
		`**Tests:** ${tests.newlyFailing.length} newly failing · ${tests.fixed.length} fixed · ${tests.added.length} added · ${tests.removed.length} removed`,
		"",
		`**Performance:** ${regressions.length} regressions (${comparison.blockingRegressions} blocking) · ${measurements.filter((m) => m.verdict === "improvement").length} improvements`,
		"",
		...listChanges("Newly failing", tests.newlyFailing),
		...listChanges("Fixed", tests.fixed),
		...listChanges("No longer applies", tests.newlyNotApplicable),
		...listIds("Removed tests", tests.removed),
		...listIds("Added tests", tests.added),
	];

	if (tests.slower.length > 0) {
		lines.push(
			`**Slower tests (${tests.slower.length})**`,
			"",
			...tests.slower.map(
				(test) =>
					`- \`${test.setup} (${test.mode})\` ${test.id}: ${formatDuration(test.baseMs)} → ${formatDuration(test.headMs)}`,
			),
			"",
		);
	}

	if (measurements.length > 0) {
		lines.push("### Measurements", "");
		if (changed.length > 0) {
			lines.push(...renderTable(changed), "");
		}
		//* folded away, so a reviewer sees what changed without reading every row
		if (unchanged.length > 0) {
			lines.push(
				`<details><summary>${unchanged.length} measurements with no real change</summary>`,
				"",
				...renderTable(unchanged),
				"",
				"</details>",
				"",
			);
		}
		lines.push(
			"Timings and memory come from different machines, so they are reported but do not fail the comparison. Sizes are exact and do.",
			"",
		);
	}

	if (comparison.notCompared.length > 0) {
		lines.push(
			`Not compared, as the base run did not include them: ${comparison.notCompared.join(", ")}.`,
			"",
		);
	}

	return lines.join("\n");
};

export default renderComparison;
