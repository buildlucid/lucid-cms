import { randomUUID } from "node:crypto";
import { agentFormatter } from "../../libs/formatters/index.js";
import { AgentMemoriesRepository } from "../../libs/repositories/index.js";
import type { AgentMemory, AgentMemoryScope } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getDisplayUsers from "../users/helpers/get-display-users.js";
import checkMemoryAccess from "./helpers/check-memory-access.js";
import checkMemoryCapacity from "./helpers/check-memory-capacity.js";
import checkMemoryScope from "./helpers/check-memory-scope.js";
import getAgentActors from "./helpers/get-agent-actors.js";
import getEditableMemories from "./helpers/get-editable-memories.js";

/**
 * Adds or replaces memories after checking scope, access and capacity.
 * @remarks Replacements retain the first memory's ID and remove the rest, allowing merges.
 */
const saveMemory: ServiceFn<
	[
		{
			userId: number;
			/** The agent run saving it for the person. */
			runId?: string;
			scope: AgentMemoryScope;
			content: string;
			/** Memories to update or merge, empty to add a new one. */
			replaces: string[];
			/** Reviewed snapshots used to reject content or scope changes before replacement. */
			reviewed?: Pick<AgentMemory, "id" | "scope" | "content">[];
		},
	],
	AgentMemory
> = async (context, input) => {
	const access = await checkMemoryAccess(context, { userId: input.userId });
	if (access.error) return access;
	const { canManageShared } = access.data;

	const scope = await checkMemoryScope(context, {
		scope: input.scope,
		canManageShared,
	});
	if (scope.error) return scope;

	const replaced = await getEditableMemories(context, {
		userId: input.userId,
		ids: input.replaces,
		reviewed: input.reviewed,
		canManageShared,
	});
	if (replaced.error) return replaced;

	const capacity = await checkMemoryCapacity(context, {
		userId: input.userId,
		scope: input.scope,
		replaced: replaced.data,
	});
	if (capacity.error) return capacity;

	const AgentMemories = new AgentMemoriesRepository(context.db);

	const now = new Date().toISOString();
	const [kept, ...merged] = replaced.data;
	const data = {
		owner_user_id: input.scope === "shared" ? null : input.userId,
		//* Keep each memory on one line in the agent's instructions.
		content: input.content.replace(/\s+/g, " ").trim(),
		updated_by: input.userId,
		updated_by_run_id: input.runId ?? null,
		updated_at: now,
	};
	const saved = kept
		? await AgentMemories.updateSingle({
				where: [{ key: "id", operator: "=", value: kept.id }],
				data,
				returnAll: true,
				validation: { enabled: true },
			})
		: await AgentMemories.createSingle({
				data: {
					...data,
					id: randomUUID(),
					created_by: input.userId,
					created_by_run_id: input.runId ?? null,
					created_at: now,
				},
				returnAll: true,
				validation: { enabled: true },
			});
	if (saved.error) return saved;

	if (merged.length) {
		const removed = await AgentMemories.deleteMultiple({
			where: [{ key: "id", operator: "in", value: merged.map(({ id }) => id) }],
		});
		if (removed.error) return removed;
	}

	const users = await getDisplayUsers(context, {
		ids: [saved.data.created_by, saved.data.updated_by],
	});
	if (users.error) return users;

	const agents = await getAgentActors(context, {
		runIds: [saved.data.created_by_run_id, saved.data.updated_by_run_id],
	});
	if (agents.error) return agents;

	return {
		error: undefined,
		data: agentFormatter.formatMemory({
			memory: saved.data,
			users: users.data,
			agents: agents.data,
		}),
	};
};

export default saveMemory;
