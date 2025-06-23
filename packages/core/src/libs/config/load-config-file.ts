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

const jiti = createJiti(import.meta.url);

export const loadConfigFile = async (props?: {
	path?: string;
}): Promise<{
	config: Config;
	adapter?: LucidAdapter;
}> => {
	const configPath = props?.path ? props.path : getConfigPath(process.cwd());
	const importPath = pathToFileURL(path.resolve(configPath)).href;

	const configModule = await jiti.import<{
		default: LucidAdapterDefineConfig;
		adapter?: LucidAdapter;
	}>(importPath);

	let env: Record<string, unknown> | undefined;
	if (configModule.adapter?.getEnvVars) {
		env = await configModule.adapter?.getEnvVars();
	}

	const config = await processConfig(configModule.default(env));
	const adapter = configModule.adapter;

	return {
		config,
		adapter,
	};
};

export default loadConfigFile;
