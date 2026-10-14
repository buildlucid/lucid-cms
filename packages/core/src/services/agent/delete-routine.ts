import { copy } from "../../libs/i18n/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import resolveNotification from "../notifications/resolve.js";
import sendNotification from "../notifications/send.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";
import { agentNotificationKeys } from "./notifications/keys.js";
import { routineFailedNotification } from "./notifications/routine-failed.js";
import { routineManagedNotification } from "./notifications/routine-managed.js";

/** Deletes an admin routine, preserving chats and notifying its owner of another user's oversight action. */
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

	if (
		routine.data.access === "oversight" &&
		routine.data.user_id !== null &&
		routine.data.user_id !== input.userId
	) {
		const notified = await sendNotification(context, {
			definition: routineManagedNotification,
			recipients: [routine.data.user_id],
			actorUserId: input.userId,
			data: { name: routine.data.name, action: "deleted" },
		});
		if (notified.error) return notified;
	}

	return resolveNotification(context, {
		definition: routineFailedNotification,
		key: agentNotificationKeys.routineFailed(input.id),
	});
};

export default deleteRoutine;
