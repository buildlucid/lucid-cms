import type { AiModelCatalog } from "@types";
import { describe, expect, it } from "vitest";
import { getAvailableModelSelection } from "./agent-models";

const catalog: AiModelCatalog = {
	default: { modelId: "reasoning-model", reasoningEffort: "low" },
	models: [
		{
			id: "reasoning-model",
			name: "Reasoning model",
			description: "",
			inputTokenLimit: 100_000,
			toolLimit: 100,
			reasoningEfforts: ["low", "high"],
			defaultReasoningEffort: "low",
		},
		{
			id: "fast-model",
			name: "Fast model",
			description: "",
			inputTokenLimit: 100_000,
			toolLimit: 100,
			reasoningEfforts: [],
			defaultReasoningEffort: null,
		},
	],
};

describe("restoring model preferences", () => {
	it("keeps an offered model and supported effort", () => {
		expect(
			getAvailableModelSelection(catalog, {
				modelId: "reasoning-model",
				reasoningEffort: "high",
			}),
		).toEqual({ modelId: "reasoning-model", reasoningEffort: "high" });
	});

	it("follows the agent default when the preference is unset or no longer offered", () => {
		expect(getAvailableModelSelection(catalog)).toBeNull();
		expect(
			getAvailableModelSelection(catalog, { modelId: "removed-model" }),
		).toBeNull();
	});

	it("uses the model default when its effort is no longer supported", () => {
		expect(
			getAvailableModelSelection(catalog, {
				modelId: "reasoning-model",
				reasoningEffort: "medium",
			}),
		).toEqual({ modelId: "reasoning-model", reasoningEffort: "low" });
	});

	it("clears reasoning effort for a model without reasoning", () => {
		expect(
			getAvailableModelSelection(catalog, {
				modelId: "fast-model",
				reasoningEffort: "high",
			}),
		).toEqual({ modelId: "fast-model", reasoningEffort: null });
	});
});
