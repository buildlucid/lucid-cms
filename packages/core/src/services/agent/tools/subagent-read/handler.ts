import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { AgentConversationsRepository } from "../../../../libs/repositories/index.js";
import type {
	AgentToolExecution,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import readHistory from "../../helpers/read-history.js";
import readReferences from "../../helpers/read-references.js";
import resolveSubagent from "../../helpers/subagents/resolve-subagent.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Lists the chat's sub-agents, or reads one sub-agent's messages or linked resources. */
const handler: ServiceFn<
	[{ input: z.output<typeof inputSchema>; execution: AgentToolExecution }],
	AgentToolResult<z.output<typeof outputSchema>>
> = async (context, { input, execution }) => {
	if (!input.subagentId) {
		const Conversations = new AgentConversationsRepository(context.db);

		const subagents = await Conversations.selectSubagents(
			execution.run.conversationId,
		);
		if (subagents.error) return subagents;

		return {
			error: undefined,
			data: {
				output: {
					subagents: subagents.data.map((subagent) => ({
						subagentId: subagent.id,
						agentKey: subagent.agent_key,
						title: subagent.title,
						status: subagent.latest_run_status ?? null,
						waitingFor: subagent.latest_run_waiting_for ?? null,
					})),
				},
				summary: copy(
					subagents.data.length === 1
						? "admin:core.tools.lucid_subagent_read.summary.one"
						: "admin:core.tools.lucid_subagent_read.summary",
					{ data: { count: subagents.data.length } },
				),
			},
		};
	}

	const subagent = await resolveSubagent(context, {
		execution,
		subagentId: input.subagentId,
	});
	if (subagent.error) return subagent;

	if (input.view === "references") {
		const { principal } = execution.authority;

		return readReferences(context, {
			conversationId: subagent.data.id,
			userId: principal.type === "user" ? principal.userId : null,
			offset: input.offset,
		});
	}

	return readHistory(context, {
		conversationId: subagent.data.id,
		messageId: input.messageId,
		after: input.after,
		offset: input.offset,
	});
};

export default handler;
