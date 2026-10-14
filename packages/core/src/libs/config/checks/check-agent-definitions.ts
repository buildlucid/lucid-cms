import z from "zod";
import {
	agentRoutineConversationModeSchema,
	routineToolSettingsSchema,
} from "../../../schemas/agent.js";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import {
	aiModelConfigSchema,
	aiModelSelectionSchema,
} from "../../agent/model-selection.js";
import nextRoutineOccurrence from "../../agent/next-routine-occurrence.js";
import { isRoutineDefinition } from "../../agent/registry.js";
import { agentRoutineEventsSchema } from "../../agent/routine-events.js";
import type { AgentFeatures } from "../../agent/types.js";
import { resolvedAdminCopySchema } from "../../i18n/copy.js";

const featuresSchema = z
	.object({
		media: z
			.object({
				upload: z.boolean(),
				addToLibrary: z.boolean(),
				attach: z.boolean(),
				analyze: z.boolean(),
				readFile: z.boolean(),
				generate: z.object({ image: z.boolean(), audio: z.boolean() }).strict(),
			})
			.strict(),
		documents: z.object({ attach: z.boolean() }).strict(),
		requests: z.object({ attach: z.boolean() }).strict(),
		builder: z.object({ read: z.boolean(), edit: z.boolean() }).strict(),
		memory: z.object({ read: z.boolean(), save: z.boolean() }).strict(),
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
const detailsSchema = z.object({
	name: resolvedAdminCopySchema,
	description: resolvedAdminCopySchema,
});

//* translation keys are checked by translation tooling, so only written text can be checked here
const copyText = (copy: z.output<typeof resolvedAdminCopySchema>) =>
	copy.type === "lucid.literal" ? copy.value : copy.defaultMessage;

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

		const details = detailsSchema.safeParse(agent);
		if (
			!details.success ||
			copyText(details.data.name)?.trim() === "" ||
			copyText(details.data.description)?.trim() === ""
		) {
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
				const value = copyText(copy);
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

		if (features.data.builder.edit && !features.data.builder.read) {
			throw new Error(
				`Agent "${agent.key}" turns on features.builder.edit without features.builder.read, which editing needs.`,
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

			const toolSettings = routineToolSettingsSchema.safeParse(
				routine.toolSettings,
			);
			const tools = agent.tools;
			if (
				!toolSettings.success ||
				Object.keys(toolSettings.data).some(
					(name) => !tools.some((tool) => tool.name === name),
				)
			) {
				throw new Error(
					`Routine "${label}" toolSettings must name tools available to its agent and only set "requiresConfirmation" to a boolean.`,
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

			if (routine.schedule && nextRoutineOccurrence(routine.schedule).error) {
				throw new Error(`Routine "${label}" has an invalid schedule.`);
			}

			const events = agentRoutineEventsSchema.safeParse(routine.events);
			if (!events.success) {
				throw new Error(
					`Routine "${label}" has invalid events: ${z.prettifyError(events.error)}`,
				);
			}
			if (!routine.schedule && events.data.length === 0) {
				throw new Error(
					`Routine "${label}" needs a schedule or at least one event.`,
				);
			}
		}
	}
};

export default checkAgentDefinitions;
