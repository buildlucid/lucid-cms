import { randomUUID } from "node:crypto";
import { previousRunSummary } from "../../../libs/agent/instructions/messages.js";
import formatter from "../../../libs/formatters/index.js";
import {
	AgentRoutinesRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type { AgentRoutineTrigger } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import withTransaction from "../../../utils/services/with-transaction.js";
import startRun from "../start-run.js";
import enqueueRun from "./enqueue-run.js";
import insertConversation from "./insert-conversation.js";

/**
 * Starts one routine occurrence. Reuse mode continues the routine's saved chat,
 * creating it on the first run. Otherwise each run starts a new chat with the
 * previous run's summary. The run acts for the routine's user, or for the system
 * when it is defined in code. Returns null while the routine, or the chat it
 * reuses, still has an unfinished run.
 */
const startRoutineRun: ServiceFn<
	[{ routineId: string; trigger: AgentRoutineTrigger }],
	{ conversationId: string; runId: string } | null
> = async (context, input) =>
	withTransaction(context, async (context) => {
		const AgentRoutines = new AgentRoutinesRepository(context.db);
		const AgentRuns = new AgentRunsRepository(context.db);

		const routine = await AgentRoutines.selectSingle({
			select: [
				"id",
				"agent_key",
				"name",
				"instructions",
				"user_id",
				"conversation_mode",
				"conversation_id",
			],
			where: [{ key: "id", operator: "=", value: input.routineId }],
		});
		if (routine.error) return routine;
		if (!routine.data) return { error: undefined, data: null };

		const reusedId =
			routine.data.conversation_mode === "reuse"
				? routine.data.conversation_id
				: null;

		const active = await AgentRuns.selectActiveForRoutine({
			routineId: routine.data.id,
			conversationId: reusedId,
		});
		if (active.error) return active;
		if (active.data) return { error: undefined, data: null };

		let conversationId = reusedId;
		let summary: string | undefined;
		if (!conversationId) {
			const previous = await AgentRuns.selectLatestSummary(routine.data.id);
			if (previous.error) return previous;

			if (previous.data?.summary) {
				summary = previousRunSummary(
					formatter.formatDate(previous.data.finished_at),
					previous.data.summary,
				);
			}

			const conversation = await insertConversation(context, {
				agentKey: routine.data.agent_key,
				userId: routine.data.user_id,
				title: routine.data.name,
				routineId: routine.data.id,
			});
			if (conversation.error) return conversation;
			conversationId = conversation.data.id;

			if (routine.data.conversation_mode === "reuse") {
				const saved = await AgentRoutines.updateSingle({
					where: [{ key: "id", operator: "=", value: routine.data.id }],
					data: { conversation_id: conversationId },
				});
				if (saved.error) return saved;
			}
		}

		const run = await startRun(context, {
			conversationId,
			userId: routine.data.user_id,
			requestId: randomUUID(),
			routine: {
				id: routine.data.id,
				name: routine.data.name,
				instructions: routine.data.instructions,
				trigger: input.trigger,
			},
			context: summary,
		});
		if (run.error) return run;

		const queued = await enqueueRun(context, {
			runId: run.data.runId,
			userId: routine.data.user_id,
		});
		if (queued.error) return queued;

		return {
			error: undefined,
			data: { conversationId, runId: run.data.runId },
		};
	});

export default startRoutineRun;
