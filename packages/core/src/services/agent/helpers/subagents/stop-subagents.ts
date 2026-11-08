import {
	AgentConversationsRepository,
	AgentInputsRepository,
} from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import stopRun from "../stop-run.js";

/** Stops every sub-agent a chat still has working, and drops messages still on their way to them, when the chat's run ends or is stopped. */
const stopSubagents: ServiceFn<
	[{ conversationId: string }],
	undefined
> = async (context, input) => {
	const Conversations = new AgentConversationsRepository(context.db);
	const Inputs = new AgentInputsRepository(context.db);

	const subagents = await Conversations.selectSubagents(input.conversationId);
	if (subagents.error) return subagents;

	for (const subagent of subagents.data) {
		//* a finished sub-agent can still have its parent's message on the way, which would start it again
		if (!subagent.active_run_id) {
			const discarded = await Inputs.discardFromParent(subagent.id);
			if (discarded.error) return discarded;
			continue;
		}

		const stopped = await stopRun(context, {
			runId: subagent.active_run_id,
			conversationId: subagent.id,
			tellParent: false,
		});
		if (stopped.error) return stopped;
	}

	return { error: undefined, data: undefined };
};

export default stopSubagents;
