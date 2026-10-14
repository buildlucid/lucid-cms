import { copy } from "../../libs/i18n/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";
import startRoutineRun from "./helpers/start-routine-run.js";

/** Starts a routine run now, unless the routine already has an unfinished run. */
const runRoutine: ServiceFn<
	[{ id: string; userId: number }],
	{ conversationId: string; runId: string }
> = async (context, input) => {
	const routine = await getAccessibleRoutine(context, input);
	if (routine.error) return routine;
	//* running routines requires owner access or permission to manage code routines
	if (routine.data.access === "oversight") {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 403,
				message: copy("server:agent.routine.oversight.locked"),
			},
		};
	}

	const run = await startRoutineRun(context, {
		routineId: routine.data.id,
		trigger: "manual",
	});
	if (run.error) return run;
	if (!run.data) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 409,
				message: copy("server:agent.routine.active"),
			},
		};
	}

	return { error: undefined, data: run.data };
};

export default runRoutine;
