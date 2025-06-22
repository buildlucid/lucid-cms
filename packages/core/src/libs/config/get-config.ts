import getConfigPath from "./get-config-path.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import processConfig from "./process-config.js";
import type { Config } from "../../types/config.js";
import type { LucidConfigFactory } from "./config-factory.js";

const jiti = createJiti(import.meta.url);
let config: Config | undefined = undefined;

export const getConfig = async (props?: {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	env?: Record<string, any>;
	config?: Config;
	path?: string;
	cache?: false;
}): Promise<Config> => {
	if (props?.config) {
		config = props.config;
		return config;
	}

	if (config && !props?.cache) return config;

	const configPath = props?.path ? props.path : getConfigPath(process.cwd());
	const importPath = pathToFileURL(path.resolve(configPath)).href;

	const configModule = await jiti.import<LucidConfigFactory>(importPath, {
		default: true,
	});
	config = await processConfig(configModule(props?.env));

	return config;
};

export default getConfig;
