import merge from "lodash.merge";
import type { Config, LucidConfig } from "../../types/config.js";

const mergeConfig = (
	config: LucidConfig,
	defaultConfig: Partial<LucidConfig>,
) => {
	const clonedDefaults = structuredClone(defaultConfig);
	const defaultGuidance = clonedDefaults.ai?.guidance ?? [];
	const merged = merge(clonedDefaults, config) as Config;

	merged.ai.guidance = [...defaultGuidance, ...(config.ai?.guidance ?? [])];

	return merged;
};

export default mergeConfig;
