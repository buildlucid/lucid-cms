import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Records a routine run's outcome. The runner ends the run once this call's result is saved. */
const finish: RunnerToolInputHandler<typeof runnerTools.finish> = async (
	context,
	{ input, mode, checkpoint },
) => {
	if (mode !== "routine") {
		return toolFailure(context.translate("server:agent.tool.unavailable"));
	}

	checkpoint.finish = input;

	return toolResult({ finished: true });
};

export default finish;
