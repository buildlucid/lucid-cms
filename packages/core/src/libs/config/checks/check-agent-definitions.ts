import nextRoutineOccurrence from "../../../services/agent/helpers/next-routine-occurrence.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import { isRoutineDefinition } from "../../agent/registry.js";

//* keys appear in permission names, so they share the skill naming rules
const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Checks agent and routine keys, details and schedules at config time. */
const checkAgentDefinitions = (config: {
	ai: Pick<ResolvedLucidConfig["ai"], "agents">;
}) => {
	const keys = new Set<string>();

	for (const agent of config.ai.agents) {
		if (agent.key.length > 64 || !keyPattern.test(agent.key)) {
			throw new Error(
				`Invalid agent key "${agent.key}". Use lowercase letters, numbers and single hyphens.`,
			);
		}

		if (keys.has(agent.key)) {
			throw new Error(`Agent "${agent.key}" is registered more than once.`);
		}
		keys.add(agent.key);

		if (!agent.name.trim() || !agent.description.trim()) {
			throw new Error(`Agent "${agent.key}" needs a name and description.`);
		}

		const routineKeys = new Set<string>();

		for (const routine of agent.routines) {
			if (!isRoutineDefinition(routine)) {
				throw new Error(
					`Agent "${agent.key}" routines must be created with defineRoutine.`,
				);
			}

			const label = `${agent.key}:${routine.key}`;

			if (routine.key.length > 64 || !keyPattern.test(routine.key)) {
				throw new Error(
					`Invalid routine key "${label}". Use lowercase letters, numbers and single hyphens.`,
				);
			}

			if (routineKeys.has(routine.key)) {
				throw new Error(`Routine "${label}" is registered more than once.`);
			}

			routineKeys.add(routine.key);

			if (
				!routine.name.trim() ||
				routine.name.length > 255 ||
				!routine.instructions ||
				routine.instructions.length > 20_000
			) {
				throw new Error(
					`Routine "${label}" needs a name of up to 255 characters and instructions of up to 20000 characters.`,
				);
			}

			if (nextRoutineOccurrence(routine.schedule).error) {
				throw new Error(`Routine "${label}" has an invalid schedule.`);
			}
		}
	}
};

export default checkAgentDefinitions;
