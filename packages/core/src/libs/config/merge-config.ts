import type { LucidConfig, Config } from "../../types/config.js";
import merge from "lodash.merge";

const mergeConfig = (
	config: LucidConfig,
	defaultConfig: Partial<LucidConfig>,
) => {
	const clonedDefaults = structuredClone(defaultConfig);
	return merge(clonedDefaults, config) as Config;
};

export default mergeConfig;
