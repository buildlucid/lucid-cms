import type { RunReport } from "./types.ts";

/** Whether a run should fail the build. */
const hasFailures = (report: RunReport): boolean =>
	report.summary.failed > 0 || report.summary.errors > 0;

export default hasFailures;
