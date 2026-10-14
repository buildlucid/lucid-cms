import type { LucidAgentRoutines } from "../../../libs/db/tables/agent-routines.js";
import type { Select } from "../../../libs/db/types.js";
import { copy } from "../../../libs/i18n/index.js";
import { Permissions } from "../../../libs/permission/definitions.js";
import hasPermission from "../../../libs/permission/has-permission.js";
import { AgentRoutinesRepository } from "../../../libs/repositories/index.js";
import type { AgentRoutineAccess } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUserAccess from "../../users/resolve-access.js";
import checkAgentAccess from "./check-agent-access.js";

/**
 * Resolves routine access as owner, code manager or global overseer.
 * @remarks Global managers oversee user-created routines, including their own after losing per-agent access.
 */
const getAccessibleRoutine: ServiceFn<
	[{ id: string; userId: number }],
	Select<LucidAgentRoutines> & { access: AgentRoutineAccess }
> = async (context, input) => {
	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const result = await AgentRoutines.selectSingle({
		select: [
			"id",
			"agent_key",
			"key",
			"source",
			"name",
			"instructions",
			"model_selection",
			"conversation_mode",
			"conversation_id",
			"cron",
			"timezone",
			"events",
			"enabled",
			"user_id",
			"next_run_at",
			"created_at",
			"updated_at",
		],
		where: [{ key: "id", operator: "=", value: input.id }],
	});
	if (result.error) return result;
	if (!result.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.routine.not.found"),
			},
		};
	}

	if (result.data.source === "code") {
		const access = await checkAgentAccess(context, {
			userId: input.userId,
			agentKey: result.data.agent_key,
			action: "manage-code-routines",
		});
		if (access.error) return access;

		return { error: undefined, data: { ...result.data, access: "manager" } };
	}

	const owned =
		result.data.user_id === input.userId
			? await checkAgentAccess(context, {
					userId: input.userId,
					agentKey: result.data.agent_key,
					action: "manage-own-routines",
				})
			: undefined;
	if (owned && !owned.error) {
		return { error: undefined, data: { ...result.data, access: "owner" } };
	}

	//* global oversight also covers owners without current per-agent access
	const user = await resolveUserAccess(context, { userId: input.userId });
	if (user.error) return user;
	if (!hasPermission(user.data, Permissions.AiRoutinesManageAll)) {
		if (owned) return owned;
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 404,
				message: copy("server:agent.routine.not.found"),
			},
		};
	}

	return { error: undefined, data: { ...result.data, access: "oversight" } };
};

export default getAccessibleRoutine;
