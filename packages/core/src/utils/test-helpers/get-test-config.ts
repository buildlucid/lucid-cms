import path from "node:path";
import loadConfigFile from "../../libs/config/load-config-file.js";
import { getDirName } from "../helpers/index.js";
import type { Config } from "../../types/config.js";

const currentDir = getDirName(import.meta.url);

export const getTestConfig = (configFileName = "lucid.config.ts") => {
	let config: Config | undefined;
	const configPath = path.resolve(currentDir, "./config/", configFileName);

	const getConfig = async (): Promise<Config> => {
		if (!config) {
			const result = await loadConfigFile({ path: configPath });
			config = result.config;
		}
		return config;
	};

	const migrate = async (): Promise<void> => {
		const cfg = await getConfig();
		await cfg.db.migrateToLatest();
	};

	const destroy = async (): Promise<void> => {
		if (config) {
			await config.db.client.destroy();
			config = undefined;
		}
	};

	return {
		getConfig,
		migrate,
		destroy,
	};
};

export default getTestConfig;
