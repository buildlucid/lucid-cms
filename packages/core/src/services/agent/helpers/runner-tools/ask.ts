import constants from "../../../../constants/constants.js";
import { createInteraction } from "../../../../libs/agent/interactions.js";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Pauses user runs for an answer and returns it to the model, rejecting system runs. */
const ask: RunnerToolInputHandler<typeof runnerTools.ask> = async (
	context,
	{ call, input, answer, authority },
) => {
	if (authority.principal.type === "system") {
		return toolFailure(context.translate("server:agent.tool.unavailable"));
	}
	if (answer?.action === "submit") {
		return toolResult({
			output: answer.response,
			summary: copy("admin:core.tools.lucid_ask_user.summary"),
		});
	}

	return {
		kind: "pending",
		pending: createInteraction({
			callId: call.id,
			key: constants.agent.widgets.question,
			title: input.question,
			data: input,
		}),
	};
};

export default ask;
