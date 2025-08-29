import type z from "zod/v4";
import type LucidAdapterSchema from "./schema.js";
import type { Config, LucidConfig } from "../../types/config.js";
import type { DevLogger } from "../cli/logger/dev-logger.js";
import type { BuildLogger } from "../cli/logger/build-logger.js";

export type ServeHandler = (
	config: Config,
	logger: DevLogger,
) => Promise<() => Promise<void>>;

export type BuildHandler = (
	config: Config,
	options: {
		configPath: string;
		outputPath: string;
	},
	logger: BuildLogger,
) => Promise<void>;

export type LucidAdapter = z.infer<typeof LucidAdapterSchema>;

export type LucidAdapterDefineConfig = (
	// @ts-expect-error
	env: LucidCMS.Env,
) => LucidConfig;

export type LucidExtendAdapterDefineConfig<T extends unknown[] = []> = (
	// @ts-expect-error
	env: LucidCMS.Env,
	...args: T
) => LucidConfig;
