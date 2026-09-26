import { copy } from "../../libs/i18n/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessibleRoutine from "./helpers/get-accessible-routine.js";
import startRoutineRun from "./helpers/start-routine-run.js";

const runRoutine: ServiceFn<
	[{ id: string; userId: number }],
	{ conversationId: string; runId: string }
> = async (context, input) => {
	const routine = await getAccessibleRoutine(context, input);
	if (routine.error) return routine;

	const run = await startRoutineRun(context, { routine: routine.data });
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
