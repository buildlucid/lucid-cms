import { checkpointSchema } from "../../../../libs/agent/types.js";
import { AgentConversationsRepository } from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import isWaitOver from "../../tools/subagent-wait/is-wait-over.js";
import { waitDataSchema } from "../../tools/subagent-wait/schema.js";

/** Whether a run paused on a sub-agent wait can carry on, given its saved checkpoint. */
const isSubagentWaitOver: ServiceFn<
	[{ conversationId: string; checkpoint: unknown }],
	boolean
> = async (context, input) => {
	const checkpoint = checkpointSchema.safeParse(input.checkpoint);
	const wait = waitDataSchema.safeParse(checkpoint.data?.pending?.widget.data);
	if (!wait.success) return { error: undefined, data: false };

	const Conversations = new AgentConversationsRepository(context.db);

	const subagents = await Conversations.selectSubagents(input.conversationId);
	if (subagents.error) return subagents;

	return {
		error: undefined,
		data: isWaitOver(
			wait.data,
			new Map(
				subagents.data.map((subagent) => [
					subagent.id,
					subagent.latest_run_status ?? null,
				]),
			),
		),
	};
};

export default isSubagentWaitOver;
