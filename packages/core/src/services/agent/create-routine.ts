import { randomUUID } from "node:crypto";
import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { AgentRoutine } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkAgentAccess from "./helpers/check-agent-access.js";
import nextRoutineOccurrence from "./helpers/next-routine-occurrence.js";

/** Creates a routine that is private to the user and runs with their permissions. */
const createRoutine: ServiceFn<
	[
		{
			agentKey: string;
			userId: number;
			name: string;
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
		level: "use",
	});
	if (access.error) return access;

	const next = nextRoutineOccurrence(input);
	if (next.error) return next;

	const now = new Date().toISOString();
	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const created = await AgentRoutines.createSingle({
		data: {
			id: randomUUID(),
			agent_key: input.agentKey,
			key: null,
			source: "database",
			name: input.name,
			instructions: input.instructions,
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

	return {
		error: undefined,
		data: agentFormatter.formatRoutine({ routine: created.data }),
	};
};

export default createRoutine;
