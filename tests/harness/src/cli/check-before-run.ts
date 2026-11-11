import { existsSync } from "node:fs";
import { glob, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { paths } from "../utils/paths.ts";
import type { SetupPlan } from "./types.ts";

/** The newest change to any file in a folder, leaving out tests, which builds do not include. */
const newestChange = async (directory: string): Promise<number> => {
	let newest = 0;
	for await (const entry of glob("**/*", {
		cwd: directory,
		withFileTypes: true,
		exclude: (file) => /\.test\.tsx?$/.test(file.name),
	})) {
		if (entry.isFile()) {
			const { mtimeMs } = await stat(path.join(entry.parentPath, entry.name));
			newest = Math.max(newest, mtimeMs);
		}
	}
	return newest;
};

/** Lists the Lucid packages the tests use whose source changed after they were last built. */
const findStaleBuilds = async (): Promise<string[]> => {
	const manifest = JSON.parse(
		await readFile(path.join(paths.root, "package.json"), "utf8"),
	) as { dependencies: Record<string, string> };
	const stale: string[] = [];

	for (const name of Object.keys(manifest.dependencies)) {
		const directory = await realpath(
			path.join(paths.repository, "node_modules", name),
		).catch(() => undefined);
		if (!directory || !existsSync(path.join(directory, "src"))) {
			continue;
		}
		const [source, built] = await Promise.all([
			newestChange(path.join(directory, "src")),
			newestChange(path.join(directory, "dist")),
		]);
		if (source > built) {
			stale.push(path.relative(paths.repository, directory));
		}
	}
	return stale;
};

/**
 * Warns about stale package builds and missing browsers before running. Docker is checked when
 * services start.
 */
const checkBeforeRun = async (
	plans: readonly SetupPlan[],
): Promise<string[]> => {
	const warnings: string[] = [];

	const stale = await findStaleBuilds();
	if (stale.length > 0) {
		warnings.push(
			`${stale.join(", ")} ${stale.length === 1 ? "has" : "have"} source files newer than the last build. If you changed ${stale.length === 1 ? "it" : "them"}, run npm run build first.`,
		);
	}

	const browser = plans.some((plan) =>
		plan.jobs.some((job) => job.lane.browser),
	);
	//* loaded only when needed, as it takes a moment
	if (
		browser &&
		!existsSync((await import("@playwright/test")).chromium.executablePath())
	) {
		warnings.push(
			"Playwright's browser is not installed, so browser tests will fail. Run npx playwright install chromium.",
		);
	}

	return warnings;
};

export default checkBeforeRun;
