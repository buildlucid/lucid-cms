import constants from "../../constants/constants.js";
import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentMemoriesRepository } from "../../libs/repositories/index.js";
import type { AgentMemories } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getDisplayUsers from "../users/helpers/get-display-users.js";
import checkMemoryAccess from "./helpers/check-memory-access.js";
import getAgentActors from "./helpers/get-agent-actors.js";

/** Lists enabled personal and shared memories for the user, with each scope's limit. */
const getMemories: ServiceFn<[{ userId: number }], AgentMemories> = async (
	context,
	input,
) => {
	const access = await checkMemoryAccess(context, { userId: input.userId });
	if (access.error) return access;

	const { memory } = context.config.ai;
	const AgentMemories = new AgentMemoriesRepository(context.db);

	const memories = await AgentMemories.selectMultipleForPerson({
		userId: input.userId,
		shared: memory.shared.enabled,
		personal: memory.personal.enabled,
	});
	if (memories.error) return memories;

	const users = await getDisplayUsers(context, {
		ids: memories.data.flatMap((row) => [row.created_by, row.updated_by]),
	});
	if (users.error) return users;

	const agents = await getAgentActors(context, {
		runIds: memories.data.flatMap((row) => [
			row.created_by_run_id,
			row.updated_by_run_id,
		]),
	});
	if (agents.error) return agents;

	const formatted = memories.data.map((row) =>
		agentFormatter.formatMemory({
			memory: row,
			users: users.data,
			agents: agents.data,
		}),
	);

	return {
		error: undefined,
		data: {
			personal: {
				...memory.personal,
				memories: formatted.filter((item) => item.scope === "personal"),
			},
			shared: {
				...memory.shared,
				memories: formatted.filter((item) => item.scope === "shared"),
			},
			contentChars: constants.agent.memory.contentChars,
		},
	};
};

export default getMemories;
