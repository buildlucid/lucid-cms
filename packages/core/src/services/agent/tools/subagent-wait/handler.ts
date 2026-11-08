import type z from "zod";
import { isTerminalRunStatus } from "../../../../libs/agent/run-status.js";
import { copy } from "../../../../libs/i18n/index.js";
import { AgentRunsRepository } from "../../../../libs/repositories/index.js";
import type {
	AgentToolExecution,
	AgentToolInteraction,
	AgentToolResult,
} from "../../../../libs/tools/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getSubagentResults from "./get-subagent-results.js";
import isWaitOver from "./is-wait-over.js";
import type { outputSchema, waitDataSchema } from "./schema.js";

/**
 * Returns the sub-agents' results once the wait is over, or asks the runner to pause until it is.
 * @remarks Finished results are marked as heard, so ending a reply doesn't wait for them again.
 */
const collect: ServiceFn<
	[{ execution: AgentToolExecution; wait: z.output<typeof waitDataSchema> }],
	| AgentToolResult<z.output<typeof outputSchema>>
	| AgentToolInteraction<z.output<typeof waitDataSchema>>
> = async (context, { execution, wait }) => {
	const results = await getSubagentResults(context, {
		parentConversationId: execution.run.conversationId,
		conversationIds: wait.subagentIds,
	});
	if (results.error) return results;

	const statuses = new Map(
		results.data.map((result) => [result.subagentId, result.status]),
	);
	if (!isWaitOver(wait, statuses)) {
		return {
			error: undefined,
			data: {
				interaction: {
					title: copy("admin:core.tools.lucid_subagent_wait.waiting", {
						data: { count: wait.subagentIds.length },
					}),
					placement: "composer",
					data: wait,
				},
			},
		};
	}

	const Runs = new AgentRunsRepository(context.db);

	const finished = results.data.filter((result) =>
		isTerminalRunStatus(result.status),
	);
	const notified = await Runs.markParentNotified({
		conversationIds: finished.map((result) => result.subagentId),
		now: new Date().toISOString(),
	});
	if (notified.error) return notified;

	return {
		error: undefined,
		data: {
			output: { results: results.data },
			summary: copy(
				finished.length === 1
					? "admin:core.tools.lucid_subagent_wait.summary.one"
					: "admin:core.tools.lucid_subagent_wait.summary",
				{ data: { count: finished.length } },
			),
		},
	};
};

export default collect;
