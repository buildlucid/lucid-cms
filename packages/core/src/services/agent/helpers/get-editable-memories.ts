import type { LucidAgentMemories } from "../../../libs/db/tables/agent-memories.js";
import type { Select } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { AgentMemoriesRepository } from "../../../libs/repositories/index.js";
import type { AgentMemory } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/**
 * Loads memories in requested order, failing if any is missing or inaccessible.
 * @remarks Users can edit their own personal memories and shared memories they manage.
 */
const getEditableMemories: ServiceFn<
	[
		{
			userId: number;
			ids: string[];
			canManageShared: boolean;
			/** Reviewed snapshots used to reject missing memories or changed content or scope. */
			reviewed?: Pick<AgentMemory, "id" | "scope" | "content">[];
		},
	],
	Pick<Select<LucidAgentMemories>, "id" | "owner_user_id" | "content">[]
> = async (context, input) => {
	const ids = [...new Set(input.ids)];
	if (ids.length === 0) return { error: undefined, data: [] };

	const AgentMemories = new AgentMemoriesRepository(context.db);

	const memories = await AgentMemories.selectMultiple({
		select: ["id", "owner_user_id", "content"],
		where: [{ key: "id", operator: "in", value: ids }],
		validation: { enabled: true },
	});
	if (memories.error) return memories;

	const editable = ids.flatMap((id) => {
		const memory = memories.data.find((memory) => memory.id === id);
		const allowed =
			memory &&
			(memory.owner_user_id === input.userId ||
				(memory.owner_user_id === null && input.canManageShared));
		return allowed ? [memory] : [];
	});
	//* Missing or inaccessible reviewed memories produce a conflict.
	if (editable.length !== ids.length && !input.reviewed) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.memory.not.found"),
			},
		};
	}

	const changed =
		editable.length !== ids.length ||
		input.reviewed?.some((item) => {
			const memory = editable.find((memory) => memory.id === item.id);
			return (
				!memory ||
				memory.content !== item.content ||
				(memory.owner_user_id === null ? "shared" : "personal") !== item.scope
			);
		});
	if (changed) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.memory.changed"),
			},
		};
	}

	return { error: undefined, data: editable };
};

export default getEditableMemories;
