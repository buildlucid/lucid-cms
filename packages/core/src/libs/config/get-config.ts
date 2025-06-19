import getConfigPath from "./get-config-path.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import type { Config } from "../../types/config.js";

const jiti = createJiti(import.meta.url);
let config: Config | undefined = undefined;

export const getConfig = async (props?: {
	config?: Config;
	path?: string;
	/** Required when tests need to spyOn logger  */
	dynamicImport?: boolean;
}) => {
	if (props?.config) {
		config = props.config;
		return config;
	}

	if (config) {
		return config;
	}

	const configPath = props?.path ? props.path : getConfigPath(process.cwd());

	const importPath = pathToFileURL(path.resolve(configPath)).href;
	if (props?.dynamicImport) {
		const configModule = await import(importPath);
		config = configModule.default as Config;
	} else {
		const configModule = await jiti.import(importPath, { default: true });
		config = configModule as Config;
	}

	return config;
};

export default getConfig;
