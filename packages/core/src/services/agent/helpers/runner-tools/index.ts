import runnerTools, {
	type RunnerToolName,
} from "../../../../libs/agent/runner-tools.js";
import ask from "./ask.js";
import finish from "./finish.js";
import history from "./history.js";
import progress from "./progress.js";
import skill from "./skill.js";
import type { RunnerToolHandler } from "./types.js";

export const runnerToolHandlers: ReadonlyMap<string, RunnerToolHandler> =
	new Map(
		Object.entries({
			[runnerTools.ask.name]: ask,
			[runnerTools.progress.name]: progress,
			[runnerTools.history.name]: history,
			[runnerTools.skill.name]: skill,
			[runnerTools.finish.name]: finish,
		} satisfies Record<RunnerToolName, RunnerToolHandler>),
	);

export type * from "./types.js";
