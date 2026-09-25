import formatter from "../../libs/formatters/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { AgentRoutine } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getRoutine from "./get-routine.js";
import getOwnedRoutine from "./helpers/get-owned-routine.js";
import nextRoutineOccurrence from "./helpers/next-routine-occurrence.js";

const updateRoutine: ServiceFn<
	[
		{
			id: string;
			userId: number;
			title?: string;
			instructions?: string;
			cron?: string;
			timezone?: string;
			enabled?: boolean;
		},
	],
	AgentRoutine
> = async (context, input) => {
	const routine = await getOwnedRoutine(context, input);
	if (routine.error) return routine;

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

	const updated = await AgentRoutines.updateSingle({
		where: [{ key: "id", operator: "=", value: input.id }],
		data: {
			title: input.title,
			instructions: input.instructions,
			cron,
			timezone,
			enabled,
			...(scheduleChanged ? { next_run_at: enabled ? next.data : null } : {}),
			updated_at: new Date().toISOString(),
		},
	});
	if (updated.error) return updated;

	return getRoutine(context, input);
};

export default updateRoutine;
