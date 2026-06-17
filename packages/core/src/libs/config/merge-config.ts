import type { Config, LucidConfig } from "../../types/config.js";
import deepMerge from "../../utils/helpers/deep-merge.js";

const mergeConfig = (
	config: LucidConfig,
	defaultConfig: Partial<LucidConfig>,
) => {
	const clonedDefaults = structuredClone(defaultConfig);
	return deepMerge(clonedDefaults, config) as Config;
};

export default mergeConfig;
