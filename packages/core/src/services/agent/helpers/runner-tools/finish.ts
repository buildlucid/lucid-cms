import runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolHandler } from "./types.js";

/** Records a routine run's outcome. The runner ends the run once this call's result is saved. */
const finish: RunnerToolHandler = async (
	context,
	{ call, mode, checkpoint },
) => {
	const input = runnerTools.finish.input.safeParse(call.input);
	if (mode !== "routine" || !input.success) {
		return toolFailure(
			context.translate("server:agent.routine.finish.invalid"),
		);
	}

	checkpoint.finish = input.data;

	return { kind: "result", output: { finished: true }, failed: false };
};

export default finish;
