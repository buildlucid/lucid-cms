import constants from "../../constants/constants.js";
import logger from "../../libs/logger/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAccessToken from "../connection/token-manager.js";
import checkAgentAccess from "./helpers/check-agent-access.js";
import nextRoutineOccurrence from "./helpers/next-routine-occurrence.js";
import startRoutineRun from "./helpers/start-routine-run.js";

/**
 * Claims each due occurrence, then starts a run unless the routine is still
 * working on an earlier one. Skipped and missed occurrences are not caught up.
 */
const dispatchDueRoutines: ServiceFn<[], number> = async (context) => {
	const now = new Date();
	const routines = new AgentRoutinesRepository(context.db);

	const due = await routines.selectDue({
		now: now.toISOString(),
		limit: constants.agent.batchSize,
	});
	if (due.error) return due;
	if (!due.data.length) return { error: undefined, data: 0 };

	// The connection is site-wide, so check it once. Occurrences are still claimed without it.
	const connection = await getAccessToken(context, {});
	let started = 0;

	for (const routine of due.data) {
		if (!routine.next_run_at) continue;

		const next = nextRoutineOccurrence({
			cron: routine.cron,
			timezone: routine.timezone,
			from: now,
		});
		if (next.error) continue;

		const claim = await routines.claimOccurrence({
			id: routine.id,
			expectedNextRunAt: new Date(routine.next_run_at).toISOString(),
			nextRunAt: next.data,
			now: now.toISOString(),
		});
		if (claim.error) return claim;
		if (!claim.data || connection.error) continue;

		//* code routines act as the system, so only their agent needs to exist
		const access = await checkAgentAccess(context, {
			userId: routine.user_id,
			agentKey: routine.agent_key,
			level: "use",
		});
		if (access.error) continue;

		const run = await startRoutineRun(context, { routine });
		if (run.error) {
			logger.error({
				message: `Agent routine ${routine.id} could not start: ${context.translate(run.error.message)}`,
				scope: constants.logScopes.ai,
			});
			continue;
		}
		if (run.data) started++;
	}

	return { error: undefined, data: started };
};

export default dispatchDueRoutines;
