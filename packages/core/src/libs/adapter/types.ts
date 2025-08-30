import type z from "zod/v4";
import type RuntimeAdapterSchema from "./schema.js";
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

export type RuntimeAdapter = z.infer<typeof RuntimeAdapterSchema>;

export interface EnvironmentVariables extends Record<string, unknown> {}

export type AdapterDefineConfig = (env: EnvironmentVariables) => LucidConfig;

export type ExtendedAdapterDefineConfig<T extends unknown[] = []> = (
	env: EnvironmentVariables,
	...args: T
) => LucidConfig;
