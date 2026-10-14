import type { MemoryContext } from "../../../libs/agent/instructions/memories.js";
import { AgentMemoriesRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Loads enabled shared memories and personal memories for the run's user. */
const getRunMemories: ServiceFn<
	[{ userId: number | null }],
	Omit<MemoryContext, "save">
> = async (context, input) => {
	const { memory } = context.config.ai;
	const personal = memory.personal.enabled && input.userId !== null;
	const AgentMemories = new AgentMemoriesRepository(context.db);

	const memories = await AgentMemories.selectMultipleForPerson({
		userId: input.userId,
		shared: memory.shared.enabled,
		personal,
	});
	if (memories.error) return memories;

	const listed = (owned: boolean) =>
		memories.data
			.filter((row) => (row.owner_user_id !== null) === owned)
			.map((row) => ({ id: row.id, content: row.content }));

	return {
		error: undefined,
		data: {
			shared: memory.shared.enabled
				? { limit: memory.shared.limit, memories: listed(false) }
				: null,
			personal: personal
				? { limit: memory.personal.limit, memories: listed(true) }
				: null,
		},
	};
};

export default getRunMemories;
