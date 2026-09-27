import type { RoutineTools } from "../../../libs/agent/types.js";
import { AgentRoutineToolsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Replaces a routine's tool settings. An empty map restores every tool's defaults. Callers own the transaction. */
const saveRoutineTools: ServiceFn<
	[{ routineId: string; tools: Readonly<RoutineTools> }],
	undefined
> = async (context, input) => {
	const RoutineTools = new AgentRoutineToolsRepository(context.db);

	const removed = await RoutineTools.deleteMultiple({
		where: [{ key: "routine_id", operator: "=", value: input.routineId }],
	});
	if (removed.error) return removed;

	const data = Object.entries(input.tools).map(([tool_name, settings]) => ({
		routine_id: input.routineId,
		tool_name,
		requires_approval: settings.requiresApproval ?? null,
	}));
	if (data.length) {
		const created = await RoutineTools.createMultiple({ data });
		if (created.error) return created;
	}

	return { error: undefined, data: undefined };
};

export default saveRoutineTools;
