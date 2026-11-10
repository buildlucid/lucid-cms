import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import compareReports from "../../compare/compare-reports.ts";
import renderComparison from "../../compare/render-comparison.ts";
import type { RunReport } from "../../report/types.ts";
import { readJson, writeJson } from "../../utils/json.ts";
import { paths } from "../../utils/paths.ts";

/**
 * Compares run reports and writes JSON and Markdown results. Fails on blocking measurement
 * regressions unless `reportOnly` is set.
 */
const compareCommand = async (options: {
	base: string | undefined;
	head: string | undefined;
	reportOnly: boolean;
}): Promise<number> => {
	if (!options.base || !options.head) {
		throw new Error("Give the base and head report.json files to compare.");
	}

	const base = await readJson<RunReport>(path.resolve(options.base));
	const head = await readJson<RunReport>(path.resolve(options.head));
	const directory = path.join(paths.output, "comparison");
	await mkdir(directory, { recursive: true });

	//* a report in another format would be read wrongly, so say so instead of comparing
	if (base.version !== head.version) {
		const notice = `## Compared with the previous run\n\nNot compared. The previous run's report is in format ${base.version ?? "unknown"} and this run's is in format ${head.version}. The next run on master replaces it.\n`;
		await writeFile(path.join(directory, "comparison.md"), notice);
		console.log(notice);
		return 0;
	}

	const comparison = compareReports(base, head);
	const markdown = renderComparison(comparison);

	await writeJson(path.join(directory, "comparison.json"), comparison);
	await writeFile(path.join(directory, "comparison.md"), markdown);

	console.log(markdown);
	console.log(`Comparison: ${path.join(directory, "comparison.md")}`);

	return comparison.blockingRegressions > 0 && !options.reportOnly ? 1 : 0;
};

export default compareCommand;
