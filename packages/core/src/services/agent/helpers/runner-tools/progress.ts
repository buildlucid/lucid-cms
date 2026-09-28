import runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolHandler } from "./types.js";

/** The transcript shows the message from the call itself, so this only confirms it. */
const progress: RunnerToolHandler = async (context, { call, mode }) => {
	const input = runnerTools.progress.input.safeParse(call.input);
	if (mode !== "chat" || !input.success) {
		return toolFailure(context.translate("server:agent.progress.invalid"));
	}

	return { kind: "result", output: { shared: true }, failed: false };
};

export default progress;
