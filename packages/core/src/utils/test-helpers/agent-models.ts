import { vi } from "vitest";
import type { AiModelCatalog } from "../../types/response.js";

export const agentModelCatalog = {
	default: { modelId: "test-model", reasoningEffort: "low" },
	models: [
		{
			id: "test-model",
			name: "Test model",
			description: "Used by tests.",
			inputTokenLimit: 128_000,
			reasoningEfforts: ["low", "high"],
			defaultReasoningEffort: "low",
		},
		{
			id: "small-model",
			name: "Small model",
			description: "A model without reasoning.",
			inputTokenLimit: 16_000,
			reasoningEfforts: [],
			defaultReasoningEffort: null,
		},
	],
} satisfies AiModelCatalog;

/** Replaces the remote catalogue request, so tests never call the Lucid service. */
export const mockAgentModels = (
	catalog: () => AiModelCatalog = () => agentModelCatalog,
) => vi.fn(async () => ({ data: catalog(), error: undefined }));
