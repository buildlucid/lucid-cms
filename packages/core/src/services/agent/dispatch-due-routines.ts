import constants from "../../constants/constants.js";
import nextRoutineOccurrence from "../../libs/agent/next-routine-occurrence.js";
import logger from "../../libs/logger/index.js";
import { AgentRoutinesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkFeatureEnabled from "../ai/checks/check-feature-enabled.js";
import getAccessToken from "../connection/token-manager.js";
import checkAgentAccess from "./helpers/check-agent-access.js";
import startRoutineRun from "./helpers/start-routine-run.js";

/**
 * Claims due occurrences and starts eligible routines without an active run.
 * @remarks Logs agent unavailability; skipped and missed occurrences are not replayed.
 */
const dispatchDueRoutines: ServiceFn<[], number> = async (context) => {
	const now = new Date();
	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const due = await AgentRoutines.selectDue({
		now: now.toISOString(),
		limit: constants.agent.batchSize,
	});
	if (due.error) return due;
	if (!due.data.length) return { error: undefined, data: 0 };

	//* Check site-wide availability once; claim occurrences even when access is unavailable.
	const connection = await getAccessToken(context, {});
	const enabled = await checkFeatureEnabled(context, { feature: "agents" });
	const unavailable = connection.error ?? enabled.error;
	let started = 0;

	for (const routine of due.data) {
		if (!routine.next_run_at) continue;

		const next = nextRoutineOccurrence({
			cron: routine.cron,
			timezone: routine.timezone,
			from: now,
		});
		if (next.error) continue;

		const claim = await AgentRoutines.claimOccurrence({
			id: routine.id,
			expectedNextRunAt: new Date(routine.next_run_at).toISOString(),
			nextRunAt: next.data,
			now: now.toISOString(),
		});
		if (claim.error) return claim;
		if (!claim.data) continue;

		//* code routines act as the system, so only their agent needs to exist
		const access = unavailable
			? { error: unavailable }
			: await checkAgentAccess(context, {
					userId: routine.user_id,
					agentKey: routine.agent_key,
					action: "manage-own-routines",
				});
		if (access.error) {
			logger.warn({
				message: `Agent routine ${routine.id} skipped: ${context.translate(access.error.message)}`,
				scope: constants.logScopes.ai,
			});
			continue;
		}

		const run = await startRoutineRun(context, {
			routineId: routine.id,
			trigger: "schedule",
		});
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
