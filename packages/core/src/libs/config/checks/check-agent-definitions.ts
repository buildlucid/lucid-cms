import z from "zod";
import {
	agentRoutineConversationModeSchema,
	routineToolsSchema,
} from "../../../schemas/agent.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import {
	aiModelConfigSchema,
	aiModelSelectionSchema,
} from "../../agent/model-selection.js";
import nextRoutineOccurrence from "../../agent/next-routine-occurrence.js";
import { isRoutineDefinition } from "../../agent/registry.js";
import type { AgentFeatures } from "../../agent/types.js";
import { resolvedAdminCopySchema } from "../../i18n/copy.js";

const featuresSchema = z
	.object({
		media: z
			.object({
				upload: z.boolean(),
				attach: z.boolean(),
				analyze: z.boolean(),
			})
			.strict(),
		documents: z.object({ attach: z.boolean() }).strict(),
		web: z
			.object({
				search: z.boolean(),
				read: z.boolean(),
				allowedDomains: z.array(z.string()).optional(),
			})
			.strict(),
	})
	.strict() satisfies z.ZodType<AgentFeatures>;

//* keys appear in permission names, so they share the skill naming rules
const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const suggestionSchema = z
	.object({
		title: resolvedAdminCopySchema,
		description: resolvedAdminCopySchema,
		message: resolvedAdminCopySchema,
	})
	.strict();

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

		const suggestions = z.array(suggestionSchema).safeParse(agent.suggestions);
		if (!suggestions.success) {
			throw new Error(
				`Agent "${agent.key}" has invalid suggestions: ${z.prettifyError(suggestions.error)}`,
			);
		}

		for (const [index, suggestion] of suggestions.data.entries()) {
			for (const [field, copy] of Object.entries(suggestion)) {
				const value =
					copy.type === "lucid.literal" ? copy.value : copy.defaultMessage;
				if (value !== undefined && !value.trim()) {
					throw new Error(
						`Agent "${agent.key}" suggestion ${index + 1} needs a ${field}.`,
					);
				}
				if (field === "message" && value && value.length > 20_000) {
					throw new Error(
						`Agent "${agent.key}" suggestion ${index + 1} message must be at most 20000 characters.`,
					);
				}
			}
		}

		const features = featuresSchema.safeParse(agent.features);
		if (!features.success) {
			throw new Error(
				`Agent "${agent.key}" has invalid features: ${z.prettifyError(features.error)}`,
			);
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
			const conversationMode = agentRoutineConversationModeSchema.safeParse(
				routine.conversationMode,
			);
			if (!conversationMode.success) {
				throw new Error(
					`Routine "${label}" has an invalid conversation mode: ${z.prettifyError(conversationMode.error)}`,
				);
			}
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
			const tools = agent.tools;
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
