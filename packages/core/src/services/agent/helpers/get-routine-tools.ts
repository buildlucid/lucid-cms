import type { RoutineTools } from "../../../libs/agent/types.js";
import { AgentRoutineToolsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Loads tool settings for a batch of routines, keyed by routine ID. */
const getRoutineTools: ServiceFn<
	[string[]],
	Record<string, RoutineTools>
> = async (context, routineIds) => {
	if (!routineIds.length) return { error: undefined, data: {} };
	const RoutineTools = new AgentRoutineToolsRepository(context.db);

	const rows = await RoutineTools.selectMultiple({
		validation: { enabled: true },
		select: ["routine_id", "tool_name", "requires_approval"],
		where: [{ key: "routine_id", operator: "in", value: routineIds }],
	});
	if (rows.error) return rows;

	const data: Record<string, RoutineTools> = Object.fromEntries(
		routineIds.map((id) => [id, {}]),
	);
	for (const row of rows.data) {
		const tools = data[row.routine_id];
		if (!tools) continue;
		tools[row.tool_name] =
			row.requires_approval === null
				? {}
				: { requiresApproval: Boolean(row.requires_approval) };
	}

	return { error: undefined, data };
};

export default getRoutineTools;
