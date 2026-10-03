import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Shares the message as transcript copy while the model only receives confirmation. */
const progress: RunnerToolInputHandler<typeof runnerTools.progress> = async (
	_context,
	{ input },
) => toolResult({ output: { shared: true }, summary: input.message });

export default progress;
