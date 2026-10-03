import constants from "../../../../constants/constants.js";
import { createInteraction } from "../../../../libs/agent/interactions.js";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { copy } from "../../../../libs/i18n/index.js";
import { toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Pauses for a person's answer, then returns it to the model. */
const ask: RunnerToolInputHandler<typeof runnerTools.ask> = async (
	_context,
	{ call, input, answer },
) => {
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
