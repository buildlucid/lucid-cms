import { randomUUID } from "node:crypto";
import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { AgentRoutine } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import nextRoutineOccurrence from "./helpers/next-routine-occurrence.js";

const createRoutine: ServiceFn<
	[
		{
			userId: number;
			title: string;
			instructions: string;
			cron: string;
			timezone: string;
			enabled: boolean;
		},
	],
	AgentRoutine
> = async (context, input) => {
	const next = nextRoutineOccurrence(input);
	if (next.error) return next;

	const now = new Date().toISOString();
	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const created = await AgentRoutines.createSingle({
		data: {
			id: randomUUID(),
			title: input.title,
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
