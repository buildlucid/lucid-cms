import z from "zod";
import type {
	AiModelCatalog,
	AiModelConfig,
	AiModelSelection,
	AiReasoningEffort,
} from "../../types/response.js";

export const aiReasoningEffortSchema = z.enum([
	"minimal",
	"low",
	"medium",
	"high",
	"xhigh",
]) satisfies z.ZodType<AiReasoningEffort>;

const modelIdSchema = z.string().min(1).max(200);

export const aiModelSelectionSchema = z
	.object({
		modelId: modelIdSchema,
		reasoningEffort: aiReasoningEffortSchema.nullable().optional(),
	})
	.strict() satisfies z.ZodType<AiModelSelection>;

export const aiModelConfigSchema = z
	.object({
		default: aiModelSelectionSchema.optional(),
		available: z.array(modelIdSchema).min(1).optional(),
	})
	.strict()
	.refine(
		(config) =>
			!config.default ||
			!config.available ||
			config.available.includes(config.default.modelId),
		{ message: "The default model must be one of the available models." },
	) satisfies z.ZodType<AiModelConfig>;

export const aiModelCatalogSchema = z.object({
	default: z.object({
		modelId: z.string(),
		reasoningEffort: aiReasoningEffortSchema.nullable(),
	}),
	models: z.array(
		z.object({
			id: z.string(),
			name: z.string(),
			description: z.string(),
			inputTokenLimit: z.number().int().positive(),
			reasoningEfforts: z.array(aiReasoningEffortSchema),
			defaultReasoningEffort: aiReasoningEffortSchema.nullable(),
		}),
	),
}) satisfies z.ZodType<AiModelCatalog>;

/**
 * Picks the model for a run. The agent's `available` list narrows the hosted
 * catalogue, then the first choice it still offers wins: the chat's, the
 * routine's, the agent's default, then the hosted default. A missing or
 * unsupported effort falls back to the model's default, or its lowest effort.
 */
export const resolveModelSelection = (props: {
	catalog: AiModelCatalog;
	agent?: AiModelConfig;
	routine?: AiModelSelection | null;
	selection?: AiModelSelection | null;
}) => {
	const available = props.agent?.available;

	const models = available
		? props.catalog.models.filter((model) => available.includes(model.id))
		: props.catalog.models;

	const preferred = [
		props.selection,
		props.routine,
		props.agent?.default,
		props.catalog.default,
	].find((choice) => models.some((model) => model.id === choice?.modelId));

	const model =
		models.find((model) => model.id === preferred?.modelId) ?? models[0];
	if (!model) return undefined;

	//* a model that reasons always gets an effort, falling back to its lowest
	const reasoningEffort =
		model.reasoningEfforts.find(
			(effort) => effort === preferred?.reasoningEffort,
		) ??
		model.defaultReasoningEffort ??
		model.reasoningEfforts[0] ??
		null;

	return {
		models,
		model,
		selection: { modelId: model.id, reasoningEffort },
	};
};
