import type { LucidConfig } from "../../types/config.js";

export type LucidConfigFactory = (env?: Record<string, string>) => LucidConfig;

const configFactory = (
	configFactory: LucidConfigFactory,
): LucidConfigFactory => {
	return configFactory;
};

export default configFactory;
