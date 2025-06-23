import type z from "zod/v4";
import type LucidAdapterSchema from "./schema.js";
import type { Config, LucidConfig } from "../../types/config.js";

export type ServeHandler = (config: Config) => Promise<() => Promise<void>>;
export type BuildHandler = (
	config: Config,
	options: {
		configPath: string;
		outputPath: string;
	},
) => Promise<void>;

export type LucidAdapter = z.infer<typeof LucidAdapterSchema>;
export type LucidAdapterDefineConfig = (
	env?: Record<string, unknown>,
) => LucidConfig;
