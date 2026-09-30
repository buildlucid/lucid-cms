import { textFromParts } from "../../../../libs/agent/input.js";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/**
 * Requests completion; the runner owns saving the result and stopping execution.
 * The reply is the result people read, so a run cannot finish before giving one.
 */
const finish: RunnerToolInputHandler<typeof runnerTools.finish> = async (
	context,
	{ input, mode, checkpoint },
) => {
	if (mode !== "routine") {
		return toolFailure(context.translate("server:agent.tool.unavailable"));
	}
	if (!checkpoint.replied && !textFromParts(checkpoint.parts).trim()) {
		return toolFailure(context.translate("server:agent.routine.finish.reply"));
	}

	return { kind: "finish", finish: input };
};

export default finish;
