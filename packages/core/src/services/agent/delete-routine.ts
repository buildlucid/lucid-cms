import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getOwnedRoutine from "./helpers/get-owned-routine.js";

/** Deletes a routine. Its past conversations are kept as ordinary chats. */
const deleteRoutine: ServiceFn<
	[{ id: string; userId: number }],
	undefined
> = async (context, input) => {
	const routine = await getOwnedRoutine(context, input);
	if (routine.error) return routine;

	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const deleted = await AgentRoutines.deleteSingle({
		where: [{ key: "id", operator: "=", value: input.id }],
	});
	if (deleted.error) return deleted;

	return { error: undefined, data: undefined };
};

export default deleteRoutine;
