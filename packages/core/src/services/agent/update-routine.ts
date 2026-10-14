import { isDeepStrictEqual } from "node:util";
import nextRoutineOccurrence from "../../libs/agent/next-routine-occurrence.js";
import type { RoutineToolSettings } from "../../libs/agent/types.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import {
	AgentRoutinePendingRepository,
	AgentRoutinesRepository,
} from "../../libs/repositories/index.js";
import type {
	AgentRoutine,
	AgentRoutineConversationMode,
	AgentRoutineEvent,
	AgentRoutineSchedule,
	AiModelSelection,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import sendNotification from "../notifications/send.js";
import getRoutine from "./get-routine.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";
import resolveRoutineConversation from "./helpers/resolve-routine-conversation.js";
import saveRoutineTools from "./helpers/save-routine-tools.js";
import validateRoutineTools from "./helpers/validate-routine-tools.js";
import { routineManagedNotification } from "./notifications/routine-managed.js";

/** Updates routine settings for owners, limiting other access modes to pausing or resuming. */
const updateRoutine: ServiceFn<
	[
		{
			id: string;
			userId: number;
			name?: string;
			toolSettings?: RoutineToolSettings;
			modelSelection?: AiModelSelection | null;
			conversationMode?: AgentRoutineConversationMode;
			instructions?: string;
			/** Null removes the schedule, leaving the routine to run on events. */
			schedule?: AgentRoutineSchedule | null;
			events?: AgentRoutineEvent[];
			enabled?: boolean;
		},
	],
	AgentRoutine
> = async (context, input) => {
	const routine = await getAccessibleRoutine(context, input);
	if (routine.error) return routine;

	if (
		routine.data.access !== "owner" &&
		[
			input.name,
			input.instructions,
			input.schedule,
			input.events,
			input.toolSettings,
			input.modelSelection,
			input.conversationMode,
		].some((value) => value !== undefined)
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy(
					routine.data.access === "manager"
						? "server:agent.routine.code.locked"
						: "server:agent.routine.oversight.locked",
				),
			},
		};
	}

	if (input.toolSettings !== undefined) {
		const validation = await validateRoutineTools(context, {
			agentKey: routine.data.agent_key,
			userId: input.userId,
			tools: input.toolSettings,
		});
		if (validation.error) return validation;
	}

	const schedule =
		input.schedule !== undefined
			? input.schedule
			: routine.data.cron && routine.data.timezone
				? { cron: routine.data.cron, timezone: routine.data.timezone }
				: null;
	const events = input.events ?? routine.data.events ?? [];
	if (!schedule && events.length === 0) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.routine.trigger.required"),
			},
		};
	}

	const enabled =
		input.enabled ?? formatter.formatBoolean(routine.data.enabled);
	const next = schedule
		? nextRoutineOccurrence(schedule)
		: { error: undefined, data: null };
	if (next.error) return next;

	const scheduleChanged =
		input.schedule !== undefined || input.enabled !== undefined;
	//* Discard pending changes when disabling the routine or changing its event subscriptions.
	const clearPending =
		!enabled ||
		(input.events !== undefined &&
			!isDeepStrictEqual(input.events, routine.data.events ?? []));

	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const conversation = await resolveRoutineConversation(context, {
		routineId: input.id,
		from: routine.data.conversation_mode,
		to: input.conversationMode,
	});
	if (conversation.error) return conversation;

	const updated = await AgentRoutines.updateSingle({
		where: [{ key: "id", operator: "=", value: input.id }],
		data: {
			conversation_mode: input.conversationMode,
			conversation_id: conversation.data,
			name: input.name,
			instructions: input.instructions,
			model_selection: input.modelSelection,
			cron: schedule?.cron ?? null,
			timezone: schedule?.timezone ?? null,
			events: events.length ? events : null,
			enabled,
			...(scheduleChanged ? { next_run_at: enabled ? next.data : null } : {}),
			updated_at: new Date().toISOString(),
		},
	});
	if (updated.error) return updated;

	if (clearPending) {
		const AgentRoutinePending = new AgentRoutinePendingRepository(context.db);
		const cleared = await AgentRoutinePending.deleteMultiple({
			where: [{ key: "routine_id", operator: "=", value: input.id }],
		});
		if (cleared.error) return cleared;
	}

	if (input.toolSettings !== undefined) {
		const saved = await saveRoutineTools(context, {
			routineId: input.id,
			tools: input.toolSettings,
		});
		if (saved.error) return saved;
	}

	if (
		routine.data.access === "oversight" &&
		routine.data.user_id !== null &&
		routine.data.user_id !== input.userId &&
		enabled !== formatter.formatBoolean(routine.data.enabled)
	) {
		const notified = await sendNotification(context, {
			definition: routineManagedNotification,
			recipients: [routine.data.user_id],
			actorUserId: input.userId,
			data: { name: routine.data.name, action: enabled ? "resumed" : "paused" },
		});
		if (notified.error) return notified;
	}

	return getRoutine(context, input);
};

export default updateRoutine;
