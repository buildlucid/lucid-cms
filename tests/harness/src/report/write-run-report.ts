import { appendFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { writeJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import renderHtml from "./renderers/render-html.ts";
import renderMarkdown from "./renderers/render-markdown.ts";
import type { RunReport } from "./types.ts";

/**
 * Writes a run's report as JSON, HTML and Markdown into its folder, and points
 * `.harness/latest` at that folder. On GitHub Actions the Markdown also becomes the job summary.
 */
const writeRunReport = async (
	report: RunReport,
	directory: string,
): Promise<{ json: string; html: string }> => {
	const json = path.join(directory, "report.json");
	const html = path.join(directory, "report.html");
	const markdown = renderMarkdown(report);

	await writeJson(json, report);
	await writeFile(html, renderHtml(report));
	await writeFile(path.join(directory, "summary.md"), markdown);

	const latest = path.join(paths.output, "latest");
	await rm(latest, { force: true, recursive: true });
	await symlink(directory, latest);

	if (process.env.GITHUB_STEP_SUMMARY) {
		await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
	}

	return { json, html };
};

export default writeRunReport;
