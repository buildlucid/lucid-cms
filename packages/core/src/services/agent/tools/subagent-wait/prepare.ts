import type z from "zod";
import { isSubagentOutstanding } from "../../../../libs/agent/subagents.js";
import { copy } from "../../../../libs/i18n/index.js";
import { AgentConversationsRepository } from "../../../../libs/repositories/index.js";
import type {
	AgentToolExecution,
	AgentToolInteraction,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import collect from "./handler.js";
import type { inputSchema, outputSchema, waitDataSchema } from "./schema.js";

/**
 * Selects named sub-agents, otherwise unheard ones, or all when none are unheard. Collects
 * completed results immediately; marking them heard is idempotent.
 */
const prepare: ServiceFn<
	[{ input: z.output<typeof inputSchema>; execution: AgentToolExecution }],
	| AgentToolResult<z.output<typeof outputSchema>>
	| AgentToolInteraction<z.output<typeof waitDataSchema>>
> = async (context, { input, execution }) => {
	const Conversations = new AgentConversationsRepository(context.db);

	const subagents = await Conversations.selectSubagents(
		execution.run.conversationId,
	);
	if (subagents.error) return subagents;

	const unknown = input.subagentIds?.some(
		(id) => !subagents.data.some((subagent) => subagent.id === id),
	);
	if (subagents.data.length === 0 || unknown) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.subagent.not.found"),
			},
		};
	}

	const outstanding = subagents.data.filter(isSubagentOutstanding);
	const subagentIds =
		input.subagentIds ??
		(outstanding.length ? outstanding : subagents.data).map(
			(subagent) => subagent.id,
		);

	return collect(context, {
		execution,
		wait: { subagentIds, until: input.until },
	});
};

export default prepare;
