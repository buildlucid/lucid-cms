import constants from "../../constants/constants.js";
import logger from "../../libs/logger/index.js";
import { AgentRoutinePendingRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkFeatureEnabled from "../ai/checks/check-feature-enabled.js";
import getAccessToken from "../connection/token-manager.js";
import checkAgentAccess from "./helpers/check-agent-access.js";
import startRoutineRun from "./helpers/start-routine-run.js";

/**
 * Starts routines after content changes settle or reach the maximum wait, discarding expired changes.
 * @remarks Busy routines retain unexpired changes for their next run.
 */
const dispatchEventRoutines: ServiceFn<[], number> = async (context) => {
	const now = Date.now();
	const { quietMs, maxWaitMs, expiryMs } = constants.agent.routineEvents;
	const AgentRoutinePending = new AgentRoutinePendingRepository(context.db);

	const expired = await AgentRoutinePending.deleteExpired({
		before: new Date(now - expiryMs).toISOString(),
	});
	if (expired.error) return expired;

	const ready = await AgentRoutinePending.selectReady({
		quietBefore: new Date(now - quietMs).toISOString(),
		waitedBefore: new Date(now - maxWaitMs).toISOString(),
		activeStatuses: constants.agent.runStatuses.active,
		limit: constants.agent.batchSize,
	});
	if (ready.error) return ready;
	if (!ready.data.length) return { error: undefined, data: 0 };

	//* changes keep waiting while agents are unavailable, until they expire
	const connection = await getAccessToken(context, {});
	if (connection.error) return { error: undefined, data: 0 };
	const enabled = await checkFeatureEnabled(context, { feature: "agents" });
	if (enabled.error) return { error: undefined, data: 0 };

	let started = 0;
	for (const routine of ready.data) {
		const access = await checkAgentAccess(context, {
			userId: routine.user_id,
			agentKey: routine.agent_key,
			action: "manage-own-routines",
		});
		//* Access failures discard waiting changes for this routine.
		if (access.error) {
			logger.warn({
				message: `Agent routine ${routine.id} skipped: ${context.translate(access.error.message)}`,
				scope: constants.logScopes.ai,
			});
			const dropped = await AgentRoutinePending.deleteMultiple({
				where: [{ key: "routine_id", operator: "=", value: routine.id }],
			});
			if (dropped.error) return dropped;
			continue;
		}

		const run = await startRoutineRun(context, {
			routineId: routine.id,
			trigger: "event",
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

export default dispatchEventRoutines;
