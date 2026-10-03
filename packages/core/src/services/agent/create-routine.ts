import { randomUUID } from "node:crypto";
import nextRoutineOccurrence from "../../libs/agent/next-routine-occurrence.js";
import type { RoutineTools } from "../../libs/agent/types.js";
import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type {
	AgentRoutine,
	AgentRoutineConversationMode,
	AiModelSelection,
} from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkAgentAccess from "./helpers/check-agent-access.js";
import saveRoutineTools from "./helpers/save-routine-tools.js";
import validateRoutineTools from "./helpers/validate-routine-tools.js";

/** Creates a routine that is private to the user and runs with their permissions. */
const createRoutine: ServiceFn<
	[
		{
			agentKey: string;
			userId: number;
			name: string;
			tools?: RoutineTools;
			modelSelection?: AiModelSelection | null;
			conversationMode?: AgentRoutineConversationMode;
			instructions: string;
			cron: string;
			timezone: string;
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

	const next = nextRoutineOccurrence(input);
	if (next.error) return next;

	const tools = input.tools ?? {};
	const validation = await validateRoutineTools(context, {
		agentKey: input.agentKey,
		userId: input.userId,
		tools,
	});
	if (validation.error) return validation;

	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const now = new Date().toISOString();
	const created = await AgentRoutines.createSingle({
		data: {
			id: randomUUID(),
			agent_key: input.agentKey,
			key: null,
			source: "database",
			name: input.name,
			instructions: input.instructions,
			conversation_mode: input.conversationMode ?? "new",
			conversation_id: null,
			model_selection: input.modelSelection ?? null,
			cron: input.cron,
			timezone: input.timezone,
			enabled: input.enabled,
			user_id: input.userId,
			...(input.enabled ? { next_run_at: next.data } : {}),
			created_at: now,
			updated_at: now,
		},
		returnAll: true,
		validation: { enabled: true },
	});
	if (created.error) return created;

	const saved = await saveRoutineTools(context, {
		routineId: created.data.id,
		tools,
	});
	if (saved.error) return saved;

	return {
		error: undefined,
		data: agentFormatter.formatRoutine({ routine: created.data, tools }),
	};
};

export default createRoutine;
