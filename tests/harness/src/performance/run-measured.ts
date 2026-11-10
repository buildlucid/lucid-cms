import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { readJson } from "../utils/json.ts";
import { paths } from "../utils/paths.ts";
import { runCommand } from "../utils/run-command.ts";
import { MEASURE_OUTPUT_ENV, type ProcessUsage } from "./measure-process.ts";

export type MeasuredRun = ProcessUsage & {
	/** Wall-clock time from start to exit. */
	durationMs: number;
};

/**
 * Runs a Node command from `node_modules/.bin`, measuring duration, CPU and peak memory. Child
 * processes contribute only to duration. Throws on failure.
 */
const runMeasured = async (options: {
	/** The command's name in `node_modules/.bin`, such as `lucidcms`. */
	command: string;
	args: string[];
	cwd: string;
	env: Record<string, string>;
	/** The file that collects the command's output. */
	log: string;
}): Promise<MeasuredRun> => {
	const usageFile = path.join(tmpdir(), `harness-usage-${randomUUID()}.json`);
	const startedAt = performance.now();

	const code = await runCommand({
		command: process.execPath,
		args: [
			"--import",
			pathToFileURL(path.join(paths.harness, "performance/measure-process.ts"))
				.href,
			path.join(paths.bin, options.command),
			...options.args,
		],
		cwd: options.cwd,
		env: { ...options.env, [MEASURE_OUTPUT_ENV]: usageFile, CI: "true" },
		output: options.log,
	});
	const durationMs = performance.now() - startedAt;

	if (code !== 0) {
		throw new Error(
			`"${options.command} ${options.args.join(" ")}" failed with code ${code}. See ${options.log}`,
		);
	}

	try {
		return { durationMs, ...(await readJson<ProcessUsage>(usageFile)) };
	} finally {
		await rm(usageFile, { force: true });
	}
};

export default runMeasured;
