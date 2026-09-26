import { copy } from "../../libs/i18n/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";

/** Deletes a routine created in the admin. Its past conversations are kept as ordinary chats. */
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

	return { error: undefined, data: undefined };
};

export default deleteRoutine;
