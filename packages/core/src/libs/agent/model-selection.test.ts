import { describe, expect, test } from "vitest";
import { agentModelCatalog as catalog } from "../../utils/test-helpers/agent-models.js";
import { resolveModelSelection } from "./model-selection.js";

describe("model selection", () => {
	test("prefers the chat, then the routine, agent and hosted defaults", () => {
		const agent = {
			default: { modelId: "test-model", reasoningEffort: "high" as const },
		};
		const routine = { modelId: "small-model" };
		expect(resolveModelSelection({ catalog })?.selection).toEqual(
			catalog.default,
		);
		expect(
			resolveModelSelection({ catalog, agent })?.selection.reasoningEffort,
		).toBe("high");
		expect(
			resolveModelSelection({ catalog, agent, routine })?.selection,
		).toEqual({ modelId: "small-model", reasoningEffort: null });
		expect(
			resolveModelSelection({
				catalog,
				agent,
				routine,
				selection: catalog.default,
			})?.selection,
		).toEqual(catalog.default);
	});
	test("keeps to the agent's models and falls back when a choice is removed", () => {
		const result = resolveModelSelection({
			catalog,
			agent: { available: ["small-model"] },
			selection: { modelId: "test-model" },
		});
		expect(result?.models.map((model) => model.id)).toEqual(["small-model"]);
		expect(result?.selection).toEqual({
			modelId: "small-model",
			reasoningEffort: null,
		});
		expect(
			resolveModelSelection({ catalog, agent: { available: ["retired"] } }),
		).toBeUndefined();
	});
	test("falls back to the model's default effort without changing its model", () => {
		expect(
			resolveModelSelection({
				catalog,
				selection: { modelId: "test-model", reasoningEffort: "xhigh" },
			})?.selection,
		).toEqual(catalog.default);
	});
});
