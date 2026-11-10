import formatDuration from "../../utils/format-duration.ts";
import formatMeasurement from "../../utils/format-measurement.ts";
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
		lines.push(
			"### Measurements",
			"",
			"| Setup | Measurement | Median | Spread |",
			"| --- | --- | ---: | ---: |",
			...measured.flatMap((lane) =>
				lane.measurements.map(
					(measurement) =>
						`| ${lane.setup} | ${measurement.label} | ${formatMeasurement(measurement.value, measurement.unit)} | ±${(measurement.spread * 100).toFixed(1)}% |`,
				),
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
