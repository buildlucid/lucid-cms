import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import type { ZodType } from "zod";
import type { Config } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import cliLogger from "../cli/logger.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
	LucidConfigDefinition,
	RuntimeAdapter,
	RuntimeConfigureLucid,
	RuntimeConfigureLucidModule,
} from "../runtime/types.js";
import getConfigPath from "./get-config-path.js";
import { resolveConfigDefinition } from "./resolve-config-definition.js";
import loadConfigModule from "./utils/load-config-module.js";

export type LoadConfigResult = {
	configPath: string;
	/** Local source modules imported by the config when dependency collection is enabled. */
	configDependencies: string[];
	projectRoot: string;
	runtimeContext: AdapterRuntimeContext;
	config: Config;
	adapter: RuntimeAdapter;
	envSchema?: ZodType;
	env: EnvironmentVariables | undefined;
	definition: LucidConfigDefinition;
};

export const loadConfigFile = async (props?: {
	path?: string;
	silent?: boolean;
	configureLucidPath?: string;
	/** Collects local config imports for development watchers. */
	collectConfigDependencies?: boolean;
	prepareRuntime?: boolean;
	validateEnvSchema?: boolean;
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

	const jiti = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: collectConfigDependencies,
	});

	const { module: configModule, dependencies: configDependencies } =
		await loadConfigModule<{
			default: unknown;
			env?: ZodType;
		}>({
			loader: jiti,
			specifier: importPath,
			clearCache: collectConfigDependencies,
			dependencyEntryPath: collectConfigDependencies ? configPath : undefined,
		});
	const hasNamedEnvExport = Object.hasOwn(configModule, "env");
	let configureLucid: RuntimeConfigureLucid | undefined;

	if (props?.configureLucidPath) {
		// Use Jiti here so host wrappers stay outside consumer bundler graphs.
		const { module: configureLucidModule } = await loadConfigModule<
			Partial<RuntimeConfigureLucidModule> & {
				default?: RuntimeConfigureLucid;
			}
		>({
			loader: jiti,
			specifier: props.configureLucidPath,
			clearCache: collectConfigDependencies,
		});
		configureLucid =
			configureLucidModule.configureLucid ?? configureLucidModule.default;

		if (typeof configureLucid !== "function") {
			throw new LucidError({
				message: `Lucid could not load the configureLucid() export from "${props.configureLucidPath}".`,
			});
		}
	}

	const resolved = await resolveConfigDefinition({
		definition: configModule.default,
		envSchema: hasNamedEnvExport ? configModule.env : undefined,
		configureLucid,
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
		configDependencies,
		projectRoot,
		runtimeContext: resolved.runtimeContext,
		config: resolved.config,
		adapter: resolved.adapter,
		envSchema: resolved.envSchema,
		env: resolved.env,
		definition: resolved.definition,
	};
};

export default loadConfigFile;
