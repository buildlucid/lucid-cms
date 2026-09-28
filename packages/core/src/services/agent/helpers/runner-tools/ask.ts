import constants from "../../../../constants/constants.js";
import { createInteraction } from "../../../../libs/agent/interactions.js";
import runnerTools from "../../../../libs/agent/runner-tools.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolHandler } from "./types.js";

/** Pauses for a person's answer, then returns it to the model. */
const ask: RunnerToolHandler = async (context, { call, answer }) => {
	const input = runnerTools.ask.input.safeParse(call.input);
	if (!input.success) {
		return toolFailure(context.translate("server:agent.question.invalid"));
	}
	if (answer?.action === "submit") {
		return { kind: "result", output: answer.response, failed: false };
	}

	return {
		kind: "pending",
		pending: createInteraction({
			callId: call.id,
			key: constants.agent.widgets.question,
			title: input.data.question,
			data: input.data,
		}),
	};
};

export default ask;
