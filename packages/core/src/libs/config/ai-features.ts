import type {
	AiFeatureConfig,
	ResolvedLucidConfig,
} from "../../types/config.js";

export const isAiFeatureEnabled = (
	config: { ai: Pick<ResolvedLucidConfig["ai"], "enabled" | "features"> },
	feature: keyof AiFeatureConfig,
) => config.ai.enabled && config.ai.features[feature];
