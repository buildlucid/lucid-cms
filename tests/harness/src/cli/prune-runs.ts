import { lstat, readdir, readlink, rm } from "node:fs/promises";
import path from "node:path";
import { paths } from "../utils/paths.ts";

/** How many run folders a new run keeps. */
const KEEP = 20;
/** A run folder's name, such as `20261110-223015-4821`. See `createRunId`. */
const RUN_ID = /^\d{8}-\d{6}-\d{4}$/;

/**
 * Prunes old `.harness/runs` directories at startup. Preserves symlinks, the latest run and merged
 * runs; only removes valid run-ID folders.
 */
const pruneRuns = async (current: string): Promise<void> => {
	const runs = path.join(paths.output, "runs");
	const latest = await readlink(path.join(paths.output, "latest"))
		.then((target) => path.resolve(paths.output, target))
		.catch(() => undefined);
	//* run IDs start with their date and time, so names sort oldest to newest. The current run
	//* counts as one of those kept, whether or not its folder exists yet.
	const names = [
		...new Set([...(await readdir(runs).catch((): string[] => [])), current]),
	]
		.filter((name) => RUN_ID.test(name))
		.sort()
		.reverse();

	for (const name of names.slice(KEEP)) {
		const folder = path.join(runs, name);
		if (name === current || folder === latest) {
			continue;
		}
		const entry = await lstat(folder).catch(() => undefined);
		if (!entry?.isDirectory()) {
			continue;
		}
		//* removing a folder this way removes the links inside it, never what they point at
		await rm(folder, { recursive: true }).catch(() => undefined);
	}
};

export default pruneRuns;
