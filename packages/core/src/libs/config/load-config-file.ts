import getConfigPath from "./get-config-path.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import processConfig from "./process-config.js";
import type { Config } from "../../types/config.js";
import type { AdapterDefineConfig, RuntimeAdapter } from "../adapter/types.js";
import type { ZodType } from "zod/v4";

export const loadConfigFile = async (props?: {
	path?: string;
	bypassCache?: boolean;
}): Promise<{
	config: Config;
	adapter?: RuntimeAdapter;
	envSchema?: ZodType;
	env: Record<string, unknown> | undefined;
}> => {
	const configPath = props?.path ? props.path : getConfigPath(process.cwd());
	const importPath = pathToFileURL(path.resolve(configPath)).href;

	const jiti = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: false,
	});

	const configModule = await jiti.import<{
		default: AdapterDefineConfig;
		adapter?: RuntimeAdapter;
		envSchema?: ZodType;
	}>(importPath);

	let env: Record<string, unknown> | undefined;
	if (configModule.adapter?.getEnvVars) {
		env = await configModule.adapter?.getEnvVars();
	}

	const configdefault = configModule.default(env || {});
	const config = await processConfig(configdefault, props?.bypassCache);

	const adapter = configModule.adapter;
	const envSchema = configModule.envSchema;

	return {
		config,
		adapter,
		envSchema,
		env,
	};
};

export default loadConfigFile;
