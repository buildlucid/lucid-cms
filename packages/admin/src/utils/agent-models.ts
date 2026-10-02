import type {
	AiModel,
	AiModelCatalog,
	AiModelSelection,
	AiReasoningEffort,
} from "@types";

/** The effort a model runs with: the chosen one when it supports it, otherwise its default. */
export const effortFor = (model: AiModel, effort?: AiReasoningEffort | null) =>
	effort && model.reasoningEfforts.includes(effort)
		? effort
		: model.defaultReasoningEffort;

/** Switches to `model`, keeping the current effort when it supports it. */
export const selectModel = (
	model: AiModel,
	effort?: AiReasoningEffort | null,
): AiModelSelection => ({
	modelId: model.id,
	reasoningEffort: effortFor(model, effort),
});

/** Restores an offered model and effort, or follows the agent default when unavailable. */
export const getAvailableModelSelection = (
	catalog: AiModelCatalog,
	selection?: AiModelSelection | null,
): AiModelSelection | null => {
	const model = catalog.models.find((model) => model.id === selection?.modelId);
	return model ? selectModel(model, selection?.reasoningEffort) : null;
};
