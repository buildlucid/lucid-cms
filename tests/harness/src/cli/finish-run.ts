import pc from "picocolors";
import hasFailures from "../report/has-failures.ts";
import renderConsole from "../report/renderers/render-console.ts";
import sendToPosthog from "../report/sinks/send-to-posthog.ts";
import type { RunReport } from "../report/types.ts";
import writeRunReport from "../report/write-run-report.ts";

/** Writes a finished run's reports, prints its summary and returns the process exit code. */
const finishRun = async (
	report: RunReport,
	directory: string,
): Promise<number> => {
	const files = await writeRunReport(report, directory);
	await sendToPosthog(report);

	console.log(renderConsole(report, directory));
	console.log(pc.dim(`Report: ${files.html}`));

	return hasFailures(report) ? 1 : 0;
};

export default finishRun;
