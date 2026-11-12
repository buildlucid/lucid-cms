import { appendFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { writeJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import renderMarkdown from "./renderers/render-markdown.ts";
import type { RunReport } from "./types.ts";

/**
 * Writes a run's report as JSON and Markdown into its folder, and points `.harness/latest` at
 * that folder. On GitHub Actions the Markdown also becomes the job summary.
 */
const writeRunReport = async (
	report: RunReport,
	directory: string,
): Promise<void> => {
	const markdown = renderMarkdown(report);

	await writeJson(path.join(directory, "report.json"), report);
	await writeFile(path.join(directory, "summary.md"), markdown);

	const latest = path.join(paths.output, "latest");
	//* `latest` is a link, so this removes the link and never the run it points at
	await rm(latest, { force: true });
	await symlink(directory, latest);

	if (process.env.GITHUB_STEP_SUMMARY) {
		await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
	}
};

export default writeRunReport;
