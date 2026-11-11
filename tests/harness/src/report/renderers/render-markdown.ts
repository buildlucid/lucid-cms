import formatDuration from "../../utils/format-duration.ts";
import formatMeasurement from "../../utils/format-measurement.ts";
import groupMeasurements from "../group-measurements.ts";
import listFailures from "../list-failures.ts";
import summarizeBySetup from "../summarize-by-setup.ts";
import type { RunReport } from "../types.ts";

/** Renders a run as Markdown, for a GitHub job summary or a pull request comment. */
const renderMarkdown = (report: RunReport): string => {
	const { summary } = report;
	const lines = [
		"## Lucid test harness",
		"",
		`**${summary.passed}/${summary.applicable} applicable tests passed** · ${summary.failed} failed · ${summary.skipped} skipped · ${summary.errors} lane errors, in ${formatDuration(report.durationMs)} (seed \`${report.seed}\`)`,
		"",
		"| Setup | Passed | Failed | Skipped | Not applicable |",
		"| --- | ---: | ---: | ---: | ---: |",
		...summarizeBySetup(report.lanes).map(
			({ setup, summary: counts }) =>
				`| ${counts.failed + counts.errors > 0 ? "❌" : "✅"} ${setup} | ${counts.passed}/${counts.applicable} | ${counts.failed + counts.errors} | ${counts.skipped} | ${counts.notApplicable} |`,
		),
		"",
	];

	const measured = report.lanes.filter((lane) => lane.measurements.length > 0);
	if (measured.length > 0) {
		const groups = new Map(
			measured.map((lane) => [
				lane.setup,
				groupMeasurements(lane.measurements),
			]),
		);
		const rows = new Map(
			[...groups.values()].flat().map((group) => [group.id, group.label]),
		);
		const cell = (setup: string, id: string): string => {
			const group = groups.get(setup)?.find((candidate) => candidate.id === id);
			if (!group) {
				return "–";
			}
			const { value, p95, queries } = group;
			return [
				`${formatMeasurement(value.value, value.unit)} ±${(value.spread * 100).toFixed(1)}%`,
				p95 ? `p95 ${formatMeasurement(p95.value, p95.unit)}` : null,
				queries
					? `${queries.value} ${queries.value === 1 ? "query" : "queries"}`
					: null,
			]
				.filter((part) => part !== null)
				.join(" · ");
		};

		lines.push(
			"### Measurements",
			"",
			"Medians, with how much the samples varied.",
			"",
			`| Measurement | ${measured.map((lane) => lane.setup).join(" | ")} |`,
			`| --- | ${measured.map(() => "---:").join(" | ")} |`,
			...[...rows].map(
				([id, label]) =>
					`| ${label} | ${measured.map((lane) => cell(lane.setup, id)).join(" | ")} |`,
			),
			"",
		);
	}

	const failures = listFailures(report);
	if (failures.length > 0) {
		lines.push("### Failures", "");
		for (const failure of failures) {
			lines.push(
				`<details><summary><code>${failure.lane.setup} (${failure.lane.mode})</code> ${failure.title}</summary>`,
				"",
				"```",
				failure.error,
				"```",
				"",
				"</details>",
				"",
			);
		}
	}

	if (report.mismatches.length > 0) {
		lines.push("### Simulations that differed between setups", "");
		for (const mismatch of report.mismatches) {
			lines.push(
				`- \`${mismatch.id}\` with seed \`${mismatch.seed}\`: ${Object.entries(
					mismatch.digests,
				)
					.map(([setup, digest]) => `${setup} \`${digest.slice(0, 12)}\``)
					.join(", ")}`,
			);
		}
		lines.push("");
	}

	if (report.neverRan.length > 0) {
		lines.push(
			"### Tests that applied to no setup",
			"",
			...report.neverRan.map((id) => `- \`${id}\``),
			"",
		);
	}

	return lines.join("\n");
};

export default renderMarkdown;
