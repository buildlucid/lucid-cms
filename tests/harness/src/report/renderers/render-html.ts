import formatDuration from "../../utils/format-duration.ts";
import formatMeasurement from "../../utils/format-measurement.ts";
import buildMatrix, { type MatrixRow } from "../build-matrix.ts";
import listFailures from "../list-failures.ts";
import summarizeBySetup from "../summarize-by-setup.ts";
import type { RunReport, TestRecord, TestStatus } from "../types.ts";

const escape = (value: string): string =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");

const SYMBOLS = {
	passed: "✓",
	failed: "✗",
	skipped: "–",
	notApplicable: "n/a",
} as const satisfies Record<TestStatus, string>;

const STYLES = `
:root { color-scheme: light dark; --bg: #fff; --fg: #1a1a1a; --dim: #6b7280; --line: #e5e7eb; --pass: #15803d; --fail: #b91c1c; --skip: #a16207; --fail-bg: #fef2f2; }
@media (prefers-color-scheme: dark) { :root { --bg: #111; --fg: #eee; --dim: #9ca3af; --line: #2a2a2a; --pass: #4ade80; --fail: #f87171; --skip: #facc15; --fail-bg: #2a1414; } }
body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--fg); font: 14px/1.5 system-ui, sans-serif; }
main { max-width: 1200px; margin: 0 auto; }
h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 32px 0 8px; }
.dim { color: var(--dim); } .passed { color: var(--pass); } .failed { color: var(--fail); } .skipped { color: var(--skip); } .notApplicable { color: var(--dim); font-size: 12px; }
td.number, th.number { text-align: right; }
.scroll { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
th { font-weight: 600; white-space: nowrap; } td.cell, th.cell { text-align: center; }
td:first-child { min-width: 320px; }
tr.file td { font-weight: 600; padding-top: 16px; }
tr.has-failure { background: var(--fail-bg); }
pre { overflow-x: auto; padding: 12px; border: 1px solid var(--line); border-radius: 6px; font-size: 12px; }
`;

const renderCell = (test: TestRecord | undefined): string => {
	if (!test) {
		return '<td class="cell dim" title="Did not run">·</td>';
	}
	const title = test.skipReason ?? formatDuration(test.durationMs);
	return `<td class="cell ${test.status}" title="${escape(title)}">${SYMBOLS[test.status]}${test.flaky ? "*" : ""}</td>`;
};

const renderRows = (rows: MatrixRow[], columns: string[]): string => {
	let file = "";
	return rows
		.map((row) => {
			const heading = `${row.lane}/${row.file}`;
			const fileRow =
				heading === file
					? ""
					: `<tr class="file"><td colspan="${columns.length + 1}">${escape(heading)}</td></tr>`;
			file = heading;
			const failed = columns.some(
				(column) => row.cells[column]?.status === "failed",
			);
			return `${fileRow}<tr class="${failed ? "has-failure" : ""}"><td>${escape(row.title)}</td>${columns.map((column) => renderCell(row.cells[column])).join("")}</tr>`;
		})
		.join("\n");
};

const renderMeasurements = (report: RunReport): string => {
	const rows = report.lanes.flatMap((lane) =>
		lane.measurements.map(
			(measurement) =>
				`<tr><td>${escape(lane.setup)}</td><td>${escape(measurement.label)}</td><td class="number">${formatMeasurement(measurement.value, measurement.unit)}</td><td class="number">±${(measurement.spread * 100).toFixed(1)}%</td><td class="number">${measurement.samples.length}</td></tr>`,
		),
	);
	if (rows.length === 0) {
		return "";
	}

	return `<h2>Measurements</h2>
<div class="scroll">
<table>
<thead><tr><th>Setup</th><th>Measurement</th><th class="number">Median</th><th class="number">Spread</th><th class="number">Samples</th></tr></thead>
<tbody>
${rows.join("\n")}
</tbody>
</table>
</div>`;
};

/** Renders a run as one self-contained page: a grid of every test against every setup, then the failures in full. */
const renderHtml = (report: RunReport): string => {
	const { columns, rows } = buildMatrix(report);
	const { summary } = report;
	const failures = listFailures(report);

	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Harness run ${escape(report.runId)}</title>
<style>${STYLES}</style>
</head>
<body>
<main>
<h1>Lucid test harness</h1>
<p class="dim">${escape(report.startedAt)} · ${escape(report.git.branch ?? "no branch")} @ ${escape(report.git.commit?.slice(0, 9) ?? "unknown")} · Node ${escape(report.node)} · seed ${report.seed} · ${formatDuration(report.durationMs)}</p>
<p><span class="passed">${summary.passed}/${summary.applicable} applicable tests passed</span> · <span class="failed">${summary.failed} failed</span> · <span class="skipped">${summary.skipped} skipped</span> · ${summary.errors} lane errors · ${summary.flaky} flaky</p>

<h2>Setups</h2>
<div class="scroll">
<table>
<thead><tr><th>Setup</th><th class="number">Passed</th><th class="number">Failed</th><th class="number">Skipped</th><th class="number">Not applicable</th></tr></thead>
<tbody>
${summarizeBySetup(report.lanes)
	.map(
		({ setup, summary: counts }) =>
			`<tr><td>${escape(setup)}</td><td class="number ${counts.failed + counts.errors === 0 ? "passed" : "failed"}">${counts.passed}/${counts.applicable}</td><td class="number">${counts.failed + counts.errors}</td><td class="number">${counts.skipped}</td><td class="number">${counts.notApplicable}</td></tr>`,
	)
	.join("\n")}
</tbody>
</table>
</div>
${renderMeasurements(report)}

<h2>Tests by setup</h2>
<div class="scroll">
<table>
<thead><tr><th>Test</th>${columns.map((column) => `<th class="cell">${escape(column)}</th>`).join("")}</tr></thead>
<tbody>
${renderRows(rows, columns)}
</tbody>
</table>
</div>
<p class="dim">✓ passed · ✗ failed · – skipped · n/a the setup lacks something the test requires (hover for what) · · did not run · * passed after a retry</p>
${
	report.neverRan.length > 0
		? `<h2>Tests that applied to no setup</h2><ul>${report.neverRan.map((id) => `<li>${escape(id)}</li>`).join("")}</ul>`
		: ""
}

${
	report.mismatches.length > 0
		? `<h2>Simulations that differed between setups</h2>${report.mismatches
				.map(
					(mismatch) =>
						`<p>${escape(mismatch.id)} with seed ${mismatch.seed}</p><pre>${escape(
							Object.entries(mismatch.digests)
								.map(([setup, digest]) => `${setup}: ${digest}`)
								.join("\n"),
						)}</pre>`,
				)
				.join("")}`
		: ""
}
${
	failures.length > 0
		? `<h2>Failures</h2>${failures
				.map(
					(failure) =>
						`<p><strong>${escape(failure.lane.setup)} (${failure.lane.mode})</strong> ${escape(failure.title)}</p><pre>${escape(failure.error)}</pre>`,
				)
				.join("")}`
		: ""
}
</main>
</body>
</html>
`;
};

export default renderHtml;
