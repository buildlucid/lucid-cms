import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ZodType } from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import cliLogger from "../cli/logger.js";
import {
	emptyPreparedResources,
	prepareResources,
} from "../resources/prepare-resources.js";
import type { PreparedResources } from "../resources/types.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeAdaptConfig,
	RuntimeAdaptConfigModule,
	RuntimeAdapter,
} from "../runtime/types.js";
import getConfigPath from "./get-config-path.js";
import { resolveConfigDefinition } from "./resolve-config-definition.js";
import loadConfigModule from "./utils/load-config-module.js";
import withConfigLoader from "./utils/with-config-loader.js";

export type LoadConfigResult = {
	configPath: string;
	resources: PreparedResources;
	/** Local source modules imported by the config when dependency collection is enabled. */
	configDependencies: string[];
	projectRoot: string;
	runtimeContext: AdapterRuntimeContext;
	config: ResolvedLucidConfig;
	adapter: RuntimeAdapter;
	envSchema?: ZodType;
	env: EnvironmentVariables | undefined;
	/** Original values for integrations that create another runtime host. */
	rawEnv: Record<string, unknown> | undefined;
	definition: LucidConfigDefinition;
};

export const loadConfigFile = async (props?: {
	path?: string;
	silent?: boolean;
	adaptConfigPath?: string;
	meta?: LucidConfigDefinitionMeta;
	/** Collects local config imports for development watchers. */
	collectConfigDependencies?: boolean;
	prepareRuntime?: boolean;
	validateEnvSchema?: boolean;
	/** Overrides the named env export before raw environment values are parsed. */
	envSchema?: ZodType;
	processConfigOptions?: Parameters<
		typeof resolveConfigDefinition
	>[0]["processConfigOptions"];
}): Promise<LoadConfigResult> => {
	const configPath = path.resolve(
		props?.path ? props.path : getConfigPath(process.cwd()),
	);
	const projectRoot = path.dirname(configPath);
	const importPath = pathToFileURL(configPath).href;
	const collectConfigDependencies = props?.collectConfigDependencies ?? false;

	return withConfigLoader(async (jiti) => {
		const { module: configModule, dependencies: configDependencies } =
			await loadConfigModule<{
				default: unknown;
				env?: ZodType;
			}>({
				loader: jiti,
				specifier: importPath,
				dependencyEntryPath: collectConfigDependencies ? configPath : undefined,
			});
		const hasNamedEnvExport = Object.hasOwn(configModule, "env");
		let adaptConfig: RuntimeAdaptConfig | undefined;

		if (props?.adaptConfigPath) {
			// Use Jiti here so host wrappers stay outside consumer bundler graphs.
			const { module: adaptConfigModule } = await loadConfigModule<
				Partial<RuntimeAdaptConfigModule> & {
					default?: RuntimeAdaptConfig;
				}
			>({
				loader: jiti,
				specifier: props.adaptConfigPath,
			});
			adaptConfig = adaptConfigModule.adaptConfig ?? adaptConfigModule.default;

			if (typeof adaptConfig !== "function") {
				throw new LucidError({
					message: `Lucid could not load the adaptConfig() export from "${props.adaptConfigPath}".`,
				});
			}
		}

		let resources = emptyPreparedResources();
		const resolved = await resolveConfigDefinition({
			prepareConfig: async (config) => {
				const prepared = await prepareResources(config, projectRoot, jiti);
				resources = prepared.resources;
				return prepared.config;
			},
			definition: configModule.default,
			envSchema:
				props?.envSchema ?? (hasNamedEnvExport ? configModule.env : undefined),
			adaptConfig,
			meta: props?.meta,
			configPath,
			projectRoot,
			prepareRuntime: props?.prepareRuntime,
			validateEnvSchema: props?.validateEnvSchema,
			logger: {
				instance: cliLogger,
				silent: props?.silent ?? false,
			},
			processConfigOptions: props?.processConfigOptions,
		});

		return {
			configPath,
			configDependencies: [
				...new Set([...configDependencies, ...resources.dependencies]),
			],
			resources,
			projectRoot,
			runtimeContext: resolved.runtimeContext,
			config: resolved.config,
			adapter: resolved.adapter,
			envSchema: resolved.envSchema,
			env: resolved.env,
			rawEnv: resolved.rawEnv,
			definition: resolved.definition,
		};
	}, projectRoot);
};

export default loadConfigFile;
