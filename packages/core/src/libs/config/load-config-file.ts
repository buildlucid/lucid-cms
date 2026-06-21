import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import type { ZodType } from "zod";
import type { Config } from "../../types/config.js";
import cliLogger from "../cli/logger.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
	LucidConfigDefinition,
	RuntimeAdapter,
} from "../runtime/types.js";
import getConfigPath from "./get-config-path.js";
import { resolveConfigDefinition } from "./resolve-config-definition.js";

export type LoadConfigResult = {
	configPath: string;
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
	prepareRuntime?: boolean;
	processConfigOptions?: Parameters<
		typeof resolveConfigDefinition
	>[0]["processConfigOptions"];
}): Promise<LoadConfigResult> => {
	const configPath = props?.path ? props.path : getConfigPath(process.cwd());
	const projectRoot = path.dirname(path.resolve(configPath));
	const importPath = pathToFileURL(path.resolve(configPath)).href;

	const jiti = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: false,
	});

	const configModule = await jiti.import<{
		default: unknown;
		env?: ZodType;
	}>(importPath);
	const hasNamedEnvExport = Object.hasOwn(configModule, "env");

	const resolved = await resolveConfigDefinition({
		definition: configModule.default,
		envSchema: hasNamedEnvExport ? configModule.env : undefined,
		configureLucidPath: props?.configureLucidPath,
		configPath,
		projectRoot,
		prepareRuntime: props?.prepareRuntime,
		logger: {
			instance: cliLogger,
			silent: props?.silent ?? false,
		},
		processConfigOptions: {
			bypassCache: true,
			...(props?.processConfigOptions ?? {}),
		},
	});

	return {
		configPath,
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
