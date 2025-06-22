import getConfigPath from "./get-config-path.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import processConfig from "./process-config.js";
import type { Config } from "../../types/config.js";
import type { LucidConfigFactory } from "./config-factory.js";

const jiti = createJiti(import.meta.url);

export const getConfig = async (props?: {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	env?: Record<string, any>;
	path?: string;
}): Promise<Config> => {
	const configPath = props?.path ? props.path : getConfigPath(process.cwd());
	const importPath = pathToFileURL(path.resolve(configPath)).href;

	const configModule = await jiti.import<LucidConfigFactory>(importPath, {
		default: true,
	});
	return processConfig(configModule(props?.env));
};

export default getConfig;
