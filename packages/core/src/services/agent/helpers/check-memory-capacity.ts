import type { LucidAgentMemories } from "../../../libs/db/tables/agent-memories.js";
import type { Select } from "../../../libs/db/types.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { AgentMemoriesRepository } from "../../../libs/repositories/index.js";
import type { AgentMemoryScope } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Checks a scope has room for one more memory once the memories it replaces are gone. */
const checkMemoryCapacity: ServiceFn<
	[
		{
			userId: number;
			scope: AgentMemoryScope;
			replaced: Pick<Select<LucidAgentMemories>, "owner_user_id">[];
		},
	],
	undefined
> = async (context, input) => {
	const owner = input.scope === "shared" ? null : input.userId;
	const AgentMemories = new AgentMemoriesRepository(context.db);

	const count = await AgentMemories.count({
		where: [
			owner === null
				? { key: "owner_user_id", operator: "is", value: null }
				: { key: "owner_user_id", operator: "=", value: owner },
		],
	});
	if (count.error) return count;

	const { limit } = context.config.ai.memory[input.scope];
	const freed = input.replaced.filter(
		(memory) => memory.owner_user_id === owner,
	).length;
	if (formatter.parseCount(count.data?.count) - freed + 1 > limit) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy(
					input.scope === "shared"
						? "server:agent.memory.shared.full"
						: "server:agent.memory.personal.full",
					{ data: { limit } },
				),
			},
		};
	}

	return { error: undefined, data: undefined };
};

export default checkMemoryCapacity;
