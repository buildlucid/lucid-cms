import type { Config } from "../../types/config.js";

export type LucidAdapterResponse = {
	key: string;
};

export type LucidAdapter = (config: Config) => LucidAdapterResponse;
