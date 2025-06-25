import getConfigPath from "./get-config-path.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import processConfig from "./process-config.js";
import type { Config } from "../../types/config.js";
import type {
	LucidAdapterDefineConfig,
	LucidAdapter,
} from "../adapter/types.js";

export const loadConfigFile = async (props?: {
	path?: string;
	bypassCache?: boolean;
}): Promise<{
	config: Config;
	adapter?: LucidAdapter;
}> => {
	const configPath = props?.path ? props.path : getConfigPath(process.cwd());
	const importPath = pathToFileURL(path.resolve(configPath)).href;

	const jiti = createJiti(import.meta.url, {
		fsCache: false,
		moduleCache: false,
	});

	const configModule = await jiti.import<{
		default: LucidAdapterDefineConfig;
		adapter?: LucidAdapter;
	}>(importPath);

	let env: Record<string, unknown> | undefined;
	if (configModule.adapter?.getEnvVars) {
		env = await configModule.adapter?.getEnvVars();
	}

	const configdefault = configModule.default(env);
	const config = await processConfig(configdefault, props?.bypassCache);

	const adapter = configModule.adapter;

	return {
		config,
		adapter,
	};
};

export default loadConfigFile;
