import { randomUUID } from "node:crypto";
import type { LucidAgentRoutines } from "../../../libs/db/tables/agent-routines.js";
import type { Select } from "../../../libs/db/types.js";
import formatter from "../../../libs/formatters/index.js";
import { AgentRunsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import createConversation from "../create-conversation.js";
import startRun from "../start-run.js";
import enqueueRun from "./enqueue-run.js";

/**
 * Starts a routine run in a new conversation, carrying over the previous run's
 * summary. Returns null when the routine still has an unfinished run.
 */
const startRoutineRun: ServiceFn<
	[
		{
			routine: Pick<
				Select<LucidAgentRoutines>,
				"id" | "title" | "instructions" | "user_id"
			>;
		},
	],
	{ conversationId: string; runId: string } | null
> = async (context, { routine }) => {
	const runs = new AgentRunsRepository(context.db);

	const active = await runs.selectActiveForRoutine(routine.id);
	if (active.error) return active;
	if (active.data) return { error: undefined, data: null };

	const previous = await runs.selectLatestSummary(routine.id);
	if (previous.error) return previous;

	const summary = previous.data?.summary
		? `Summary of the previous run (${formatter.formatDate(previous.data.finished_at)}):\n${previous.data.summary}`
		: undefined;

	return withTransaction(context, async (context) => {
		const conversation = await createConversation(context, {
			userId: routine.user_id,
			title: routine.title,
			routineId: routine.id,
		});
		if (conversation.error) return conversation;

		const run = await startRun(context, {
			conversationId: conversation.data.id,
			userId: routine.user_id,
			text: routine.instructions,
			requestId: randomUUID(),
			routineId: routine.id,
			context: summary,
		});
		if (run.error) return run;

		const queued = await enqueueRun(context, {
			runId: run.data.runId,
			userId: routine.user_id,
		});
		if (queued.error) return queued;

		return {
			error: undefined,
			data: { conversationId: conversation.data.id, runId: run.data.runId },
		};
	});
};

export default startRoutineRun;
