import { randomUUID } from "node:crypto";
import nextRoutineOccurrence from "../../libs/agent/next-routine-occurrence.js";
import type { RoutineToolSettings } from "../../libs/agent/types.js";
import { agentFormatter } from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type {
	AgentRoutine,
	AgentRoutineConversationMode,
	AgentRoutineEvent,
	AgentRoutineSchedule,
	AiModelSelection,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkAgentAccess from "./helpers/check-agent-access.js";
import saveRoutineTools from "./helpers/save-routine-tools.js";
import validateRoutineTools from "./helpers/validate-routine-tools.js";

/** Creates a private routine that runs with the user's permissions on schedules, content events or both. */
const createRoutine: ServiceFn<
	[
		{
			agentKey: string;
			userId: number;
			name: string;
			toolSettings?: RoutineToolSettings;
			modelSelection?: AiModelSelection | null;
			conversationMode?: AgentRoutineConversationMode;
			instructions: string;
			/** Null when the routine only runs on events. */
			schedule: AgentRoutineSchedule | null;
			events: AgentRoutineEvent[];
			enabled: boolean;
		},
	],
	AgentRoutine
> = async (context, input) => {
	const access = await checkAgentAccess(context, {
		userId: input.userId,
		agentKey: input.agentKey,
		action: "manage-own-routines",
	});
	if (access.error) return access;

	if (!input.schedule && input.events.length === 0) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.routine.trigger.required"),
			},
		};
	}

	const next = input.schedule
		? nextRoutineOccurrence(input.schedule)
		: { error: undefined, data: null };
	if (next.error) return next;

	const toolSettings = input.toolSettings ?? {};
	const validation = await validateRoutineTools(context, {
		agentKey: input.agentKey,
		userId: input.userId,
		tools: toolSettings,
	});
	if (validation.error) return validation;

	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const now = new Date().toISOString();
	const created = await AgentRoutines.createSingle({
		data: {
			id: randomUUID(),
			agent_key: input.agentKey,
			key: null,
			source: "own",
			name: input.name,
			instructions: input.instructions,
			conversation_mode: input.conversationMode ?? "new",
			conversation_id: null,
			model_selection: input.modelSelection ?? null,
			cron: input.schedule?.cron ?? null,
			timezone: input.schedule?.timezone ?? null,
			events: input.events.length ? input.events : null,
			enabled: input.enabled,
			user_id: input.userId,
			...(input.enabled && next.data ? { next_run_at: next.data } : {}),
			created_at: now,
			updated_at: now,
		},
		returnAll: true,
		validation: { enabled: true },
	});
	if (created.error) return created;

	const saved = await saveRoutineTools(context, {
		routineId: created.data.id,
		tools: toolSettings,
	});
	if (saved.error) return saved;

	return {
		error: undefined,
		data: agentFormatter.formatRoutine({
			routine: created.data,
			toolSettings,
		}),
	};
};

export default createRoutine;
