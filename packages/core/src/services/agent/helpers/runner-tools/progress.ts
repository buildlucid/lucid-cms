import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** The transcript shows the message from the call itself, so this only confirms it. */
const progress: RunnerToolInputHandler<typeof runnerTools.progress> = async (
	context,
	{ mode },
) =>
	mode === "chat"
		? toolResult({ shared: true })
		: toolFailure(context.translate("server:agent.tool.unavailable"));

export default progress;
