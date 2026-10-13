import type { RoutineToolSettings } from "../../../libs/agent/types.js";
import { AgentRoutineToolsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Loads tool settings for a batch of routines, keyed by routine ID. */
const getRoutineTools: ServiceFn<
	[string[]],
	Record<string, RoutineToolSettings>
> = async (context, routineIds) => {
	if (!routineIds.length) return { error: undefined, data: {} };
	const RoutineToolSettings = new AgentRoutineToolsRepository(context.db);

	const rows = await RoutineToolSettings.selectMultiple({
		validation: { enabled: true },
		select: ["routine_id", "tool_name", "requires_confirmation"],
		where: [{ key: "routine_id", operator: "in", value: routineIds }],
	});
	if (rows.error) return rows;

	const data: Record<string, RoutineToolSettings> = Object.fromEntries(
		routineIds.map((id) => [id, {}]),
	);
	for (const row of rows.data) {
		const tools = data[row.routine_id];
		if (!tools) continue;
		tools[row.tool_name] =
			row.requires_confirmation === null
				? {}
				: { requiresConfirmation: Boolean(row.requires_confirmation) };
	}

	return { error: undefined, data };
};

export default getRoutineTools;
