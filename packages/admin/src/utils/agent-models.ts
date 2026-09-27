import type { AiModel, AiModelSelection, AiReasoningEffort } from "@types";

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
