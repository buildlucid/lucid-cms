import type runnerTools from "../../../../libs/agent/runner-tools.js";
import readHistory from "../read-history.js";
import { toolFailure, toolResult } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/** Reads back saved history, including messages summarised or cut from context. */
const history: RunnerToolInputHandler<typeof runnerTools.history> = async (
	context,
	{ input, run },
) => {
	const page = await readHistory(context, {
		conversationId: run.conversation_id,
		messageId: input.messageId,
		after: input.after,
		offset: input.offset,
	});
	if (page.error) {
		return toolFailure(context.translate("server:agent.history.unavailable"));
	}

	return toolResult(page.data);
};

export default history;
