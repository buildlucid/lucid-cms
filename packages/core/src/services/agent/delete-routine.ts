import { copy } from "../../libs/i18n/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveNotification from "../notifications/resolve.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";
import { agentNotificationKeys } from "./notifications/keys.js";
import { routineFailedNotification } from "./notifications/routine-failed.js";

/** Deletes a routine created in the admin. Its past conversations retain their routine workflow permission. */
const deleteRoutine: ServiceFn<
	[{ id: string; userId: number }],
	undefined
> = async (context, input) => {
	const routine = await getAccessibleRoutine(context, input);
	if (routine.error) return routine;
	if (routine.data.source === "code") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.routine.code.locked"),
			},
		};
	}

	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const deleted = await AgentRoutines.deleteSingle({
		where: [{ key: "id", operator: "=", value: input.id }],
	});
	if (deleted.error) return deleted;

	return resolveNotification(context, {
		definition: routineFailedNotification,
		key: agentNotificationKeys.routineFailed(input.id),
	});
};

export default deleteRoutine;
