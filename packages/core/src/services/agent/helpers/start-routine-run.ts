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
import claimRoutineEvents from "./claim-routine-events.js";
import enqueueRun from "./enqueue-run.js";
import insertConversation from "./insert-conversation.js";
import startRun from "./start-run.js";

/**
 * Starts a routine occurrence in its reused chat or a new chat carrying the previous summary.
 * @remarks Admin routines act for their user; code routines act as the system.
 * @returns Null if the routine is missing, it or its reused chat has an unfinished run, or an event run has no remaining changes.
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
				"timezone",
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

		//* All triggers consume waiting changes, but event runs require at least one.
		const events = await claimRoutineEvents(context, {
			routineId: routine.data.id,
			userId: routine.data.user_id,
		});
		if (events.error) return events;
		if (input.trigger === "event" && events.data.length === 0) {
			return { error: undefined, data: null };
		}

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
			runId: randomUUID(),
			routine: {
				id: routine.data.id,
				name: routine.data.name,
				instructions: routine.data.instructions,
				trigger: input.trigger,
				events: events.data,
			},
			context: summary,
			//* event-only routines have no schedule timezone, so context defaults to UTC
			timezone: routine.data.timezone,
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
