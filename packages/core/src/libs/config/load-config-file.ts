import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import type { ZodType } from "zod/v4";
import type { Config } from "../../types/config.js";
import type {
	AdapterDefineConfig,
	EnvironmentVariables,
	RuntimeAdapter,
} from "../runtime-adapter/types.js";
import getConfigPath from "./get-config-path.js";
import processConfig from "./process-config.js";

export const loadConfigFile = async (props?: {
	path?: string;
	bypassCache?: boolean;
}): Promise<{
	config: Config;
	adapter?: RuntimeAdapter;
	envSchema?: ZodType;
	env: EnvironmentVariables | undefined;
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

	let env: EnvironmentVariables | undefined;
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
