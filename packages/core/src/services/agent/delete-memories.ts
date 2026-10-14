import { AgentMemoriesRepository } from "../../libs/repositories/index.js";
import type { AgentMemory } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkMemoryAccess from "./helpers/check-memory-access.js";
import getEditableMemories from "./helpers/get-editable-memories.js";

/** Deletes the user's own memories or shared memories they manage, failing if any is inaccessible. */
const deleteMemories: ServiceFn<
	[
		{
			userId: number;
			ids: string[];
			/** Reviewed snapshots used to reject content or scope changes before deletion. */
			reviewed?: Pick<AgentMemory, "id" | "scope" | "content">[];
		},
	],
	undefined
> = async (context, input) => {
	const access = await checkMemoryAccess(context, { userId: input.userId });
	if (access.error) return access;

	const memories = await getEditableMemories(context, {
		userId: input.userId,
		ids: input.ids,
		reviewed: input.reviewed,
		canManageShared: access.data.canManageShared,
	});
	if (memories.error) return memories;

	const AgentMemories = new AgentMemoriesRepository(context.db);

	const deleted = await AgentMemories.deleteMultiple({
		where: [
			{
				key: "id",
				operator: "in",
				value: memories.data.map((memory) => memory.id),
			},
		],
	});
	if (deleted.error) return deleted;

	return { error: undefined, data: undefined };
};

export default deleteMemories;
