import { textFromParts } from "../../../../libs/agent/input.js";
import type runnerTools from "../../../../libs/agent/runner-tools.js";
import { isSubagentOutstanding } from "../../../../libs/agent/subagents.js";
import { AgentConversationsRepository } from "../../../../libs/repositories/index.js";
import { toolFailure } from "../tool-outcome.js";
import type { RunnerToolInputHandler } from "./types.js";

/**
 * Requests completion after a reply and all sub-agent results. The runner saves the result and
 * stops execution.
 */
const finish: RunnerToolInputHandler<typeof runnerTools.finish> = async (
	context,
	{ input, mode, checkpoint, run },
) => {
	if (mode !== "routine") {
		return toolFailure(context.translate("server:agent.tool.unavailable"));
	}
	if (!checkpoint.replied && !textFromParts(checkpoint.parts).trim()) {
		return toolFailure(context.translate("server:agent.routine.finish.reply"));
	}

	//* the summary has to cover the sub-agents' work, and they stop once the run ends
	const Conversations = new AgentConversationsRepository(context.db);
	const subagents = await Conversations.selectSubagents(run.conversation_id);
	if (subagents.error) {
		return toolFailure(context.translate("server:agent.tool.unavailable"));
	}
	if (subagents.data.some(isSubagentOutstanding)) {
		return toolFailure(
			context.translate("server:agent.subagent.routine.working"),
		);
	}

	return { kind: "finish", finish: input };
};

export default finish;
