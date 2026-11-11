import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { STATUS_FILE } from "../../monitor/create-monitor.ts";
import renderDashboard from "../../monitor/render-dashboard.ts";
import type { RunState } from "../../monitor/types.ts";
import formatDuration from "../../utils/format-duration.ts";
import { readJson } from "../../utils/json.ts";
import { paths } from "../../utils/paths.ts";

/** Whether a process is still running. A process this user cannot signal still exists. */
const isRunning = (pid: number): boolean => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return (error as NodeJS.ErrnoException).code === "EPERM";
	}
};

/** The newest run that saved its state, with when it last did. */
const findLatestStatus = async () => {
	const runs = path.join(paths.output, "runs");
	const ids = await readdir(runs).catch((): string[] => []);
	//* run IDs start with their date and time, so names sort oldest to newest
	for (const id of ids
		.filter((name) => /^\d/.test(name))
		.sort()
		.reverse()) {
		const file = path.join(runs, id, STATUS_FILE);
		const saved = await stat(file).catch(() => undefined);
		if (saved) {
			return {
				state: await readJson<RunState>(file),
				savedAt: saved.mtimeMs,
				directory: path.join(runs, id),
			};
		}
	}
	return undefined;
};

/**
 * Shows the latest run's live or saved status. `json` prints saved state; exits with 1 if the run
 * died.
 */
const statusCommand = async (options: { json: boolean }): Promise<number> => {
	const latest = await findLatestStatus();
	if (!latest) {
		console.log("No run has started yet.");
		return 0;
	}

	const { state, savedAt, directory } = latest;
	const running = state.finishedAt === undefined && isRunning(state.pid);
	const died = state.finishedAt === undefined && !running;
	if (options.json) {
		console.log(JSON.stringify({ ...state, running, died }, null, "\t"));
		return died ? 1 : 0;
	}

	const ago = (time: number) => formatDuration(Date.now() - time);
	const summary = running
		? pc.cyan(`Running · updated ${ago(savedAt)} ago`)
		: died
			? pc.red(
					`Not running · process ${state.pid} ended without finishing, ${ago(savedAt)} ago. Logs are in ${directory}`,
				)
			: pc.green(
					`Finished ${ago(state.finishedAt ?? savedAt)} ago · ${path.join(directory, "report.html")}`,
				);

	console.log(summary);
	console.log("");
	console.log(
		renderDashboard(state, {
			width: process.stdout.columns ?? 120,
			//* a snapshot is printed once, so it can be as tall as it needs
			height: 1000,
			//* a run that ended is shown as it was when it last saved
			now: running ? Date.now() : (state.finishedAt ?? savedAt),
		}),
	);
	return died ? 1 : 0;
};

export default statusCommand;
