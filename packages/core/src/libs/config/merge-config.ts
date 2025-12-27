import merge from "lodash.merge";
import type { Config, LucidConfig } from "../../types/config.js";

const mergeConfig = (
	config: LucidConfig,
	defaultConfig: Partial<LucidConfig>,
) => {
	const clonedDefaults = structuredClone(defaultConfig);
	return merge(clonedDefaults, config) as Config;
};

export default mergeConfig;
