import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Shares the message as transcript copy while the model only receives confirmation. */
const progress: RunnerToolInputHandler<typeof runnerTools.progress> = async (
	context,
	{ mode, input },
) =>
	mode === "chat"
		? toolResult({ output: { shared: true }, summary: input.message })
		: toolFailure(context.translate("server:agent.tool.unavailable"));

export default progress;
