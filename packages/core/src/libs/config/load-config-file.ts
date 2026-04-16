import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import type { ZodType } from "zod";
import type { Config } from "../../types/config.js";
import cliLogger from "../cli/logger.js";
import type {
	EnvironmentVariables,
	LucidConfigDefinition,
	RuntimeAdapter,
	RuntimeAdapterEnvLoadResult,
} from "../runtime-adapter/types.js";
import getConfigPath from "./get-config-path.js";
import { resolveConfigDefinition } from "./resolve-config-definition.js";

export type LoadConfigResult = {
	config: Config;
	adapter?: RuntimeAdapter;
	envSchema?: ZodType;
	env: EnvironmentVariables | undefined;
	definition: LucidConfigDefinition;
	adapterEnvResult?: RuntimeAdapterEnvLoadResult;
};

export const loadConfigFile = async (props?: {
	path?: string;
	silent?: boolean;
	configureLucidPath?: string;
	loadRuntime?: boolean;
}): Promise<LoadConfigResult> => {
	const configPath = props?.path ? props.path : getConfigPath(process.cwd());
	const importPath = pathToFileURL(path.resolve(configPath)).href;

	const jiti = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: false,
	});

	const configModule = await jiti.import<{
		default: unknown;
		envSchema?: ZodType;
	}>(importPath);
	const hasNamedEnvSchemaExport = Object.hasOwn(configModule, "envSchema");

	const resolved = await resolveConfigDefinition({
		definition: configModule.default,
		envSchema: hasNamedEnvSchemaExport ? configModule.envSchema : undefined,
		configureLucidPath: props?.configureLucidPath,
		loadRuntime: props?.loadRuntime,
		logger: {
			instance: cliLogger,
			silent: props?.silent ?? false,
		},
	});

	return {
		config: resolved.config,
		adapter: resolved.adapter,
		envSchema: resolved.envSchema,
		env: resolved.env,
		definition: resolved.definition,
		adapterEnvResult: resolved.adapterEnvResult,
	};
};

export default loadConfigFile;
