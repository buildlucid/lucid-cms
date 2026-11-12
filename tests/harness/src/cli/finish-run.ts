import hasFailures from "../report/has-failures.ts";
import renderConsole from "../report/renderers/render-console.ts";
import type { History, RunReport } from "../report/types.ts";
import writeRunReport from "../report/write-run-report.ts";

/** Writes a finished run's reports, prints its summary and returns the process exit code. */
const finishRun = async (
	report: RunReport,
	options: {
		directory: string;
		/** What earlier runs measured, shown beside this run's measurements. */
		history?: History;
	},
): Promise<number> => {
	await writeRunReport(report, options.directory);

	console.log(
		renderConsole(report, {
			...options,
			width: process.stdout.columns ?? 120,
		}),
	);

	return hasFailures(report) ? 1 : 0;
};

export default finishRun;
