import z from "zod";
import { routineToolsSchema } from "../../../schemas/agent.js";
import nextRoutineOccurrence from "../../../services/agent/helpers/next-routine-occurrence.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import {
	aiModelConfigSchema,
	aiModelSelectionSchema,
} from "../../agent/model-selection.js";
import { isRoutineDefinition } from "../../agent/registry.js";
import { getCoreAgentTools } from "../../tools/core-tools.js";

//* keys appear in permission names, so they share the skill naming rules
const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Checks agent and routine keys, details and schedules at config time. */
const checkAgentDefinitions = (config: {
	ai: Pick<ResolvedLucidConfig["ai"], "agents">;
}) => {
	const keys = new Set<string>();

	for (const agent of config.ai.agents.definitions) {
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

		const models = aiModelConfigSchema.optional().safeParse(agent.models);
		if (!models.success) {
			throw new Error(
				`Agent "${agent.key}" has invalid models: ${z.prettifyError(models.error)}`,
			);
		}

		const routineKeys = new Set<string>();

		for (const routine of agent.routines) {
			if (!isRoutineDefinition(routine)) {
				throw new Error(
					`Agent "${agent.key}" routines must be created with defineRoutine.`,
				);
			}

			const label = `${agent.key}:${routine.key}`;
			const model = aiModelSelectionSchema.optional().safeParse(routine.model);
			if (!model.success) {
				throw new Error(
					`Routine "${label}" has an invalid model: ${z.prettifyError(model.error)}`,
				);
			}

			const available = agent.models?.available;
			if (
				routine.model &&
				available &&
				!available.includes(routine.model.modelId)
			) {
				throw new Error(
					`Routine "${label}" uses model "${routine.model.modelId}", which is not in its agent's available models.`,
				);
			}

			const routineTools = routineToolsSchema.safeParse(routine.tools);
			const tools = [...getCoreAgentTools(), ...agent.tools];
			if (
				!routineTools.success ||
				Object.keys(routineTools.data).some(
					(name) => !tools.some((tool) => tool.name === name),
				)
			) {
				throw new Error(
					`Routine "${label}" tools must name tools available to its agent and only set "requiresApproval" to a boolean.`,
				);
			}

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
