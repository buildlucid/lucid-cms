import nextRoutineOccurrence from "../../libs/agent/next-routine-occurrence.js";
import type { RoutineTools } from "../../libs/agent/types.js";
import formatter from "../../libs/formatters/index.js";
import { copy } from "../../libs/i18n/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type {
	AgentRoutine,
	AgentRoutineConversationMode,
	AiModelSelection,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRoutine from "./get-routine.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";
import resolveRoutineConversation from "./helpers/resolve-routine-conversation.js";
import saveRoutineTools from "./helpers/save-routine-tools.js";
import validateRoutineTools from "./helpers/validate-routine-tools.js";

/** Updates a routine. Routines defined in code can only be paused or resumed. */
const updateRoutine: ServiceFn<
	[
		{
			id: string;
			userId: number;
			name?: string;
			tools?: RoutineTools;
			modelSelection?: AiModelSelection | null;
			conversationMode?: AgentRoutineConversationMode;
			instructions?: string;
			cron?: string;
			timezone?: string;
			enabled?: boolean;
		},
	],
	AgentRoutine
> = async (context, input) => {
	const routine = await getAccessibleRoutine(context, input);
	if (routine.error) return routine;

	if (
		routine.data.source === "code" &&
		[
			input.name,
			input.instructions,
			input.cron,
			input.timezone,
			input.tools,
			input.modelSelection,
			input.conversationMode,
		].some((value) => value !== undefined)
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.routine.code.locked"),
			},
		};
	}

	if (input.tools !== undefined) {
		const validation = await validateRoutineTools(context, {
			agentKey: routine.data.agent_key,
			userId: input.userId,
			tools: input.tools,
		});
		if (validation.error) return validation;
	}

	const cron = input.cron ?? routine.data.cron;
	const timezone = input.timezone ?? routine.data.timezone;
	const enabled =
		input.enabled ?? formatter.formatBoolean(routine.data.enabled);
	const next = nextRoutineOccurrence({ cron, timezone });

	if (next.error) return next;

	const scheduleChanged =
		input.cron !== undefined ||
		input.timezone !== undefined ||
		input.enabled !== undefined;

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
			cron,
			timezone,
			enabled,
			...(scheduleChanged ? { next_run_at: enabled ? next.data : null } : {}),
			updated_at: new Date().toISOString(),
		},
	});
	if (updated.error) return updated;

	if (input.tools !== undefined) {
		const saved = await saveRoutineTools(context, {
			routineId: input.id,
			tools: input.tools,
		});
		if (saved.error) return saved;
	}

	return getRoutine(context, input);
};

export default updateRoutine;
