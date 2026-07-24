import path from "node:path";
import loadConfigFile from "../../libs/config/load-config-file.js";
import type { DatabaseConnection } from "../../libs/db/types.js";
import type { Config } from "../../types/config.js";
import { getDirName } from "../helpers/index.js";

const currentDir = getDirName(import.meta.url);

export const getTestConfig = (configFileName = "lucid.config.ts") => {
	let config: Config | undefined;
	let database: DatabaseConnection | undefined;
	const configPath = path.resolve(currentDir, "./config/", configFileName);

	const getConfig = async (): Promise<Config> => {
		if (!config) {
			const result = await loadConfigFile({ path: configPath });
			config = result.config;
		}
		return config;
	};

	const getDatabase = async (): Promise<DatabaseConnection> => {
		if (!database) {
			const cfg = await getConfig();
			database = await cfg.db.connect();
		}
		return database;
	};

	const migrate = async (): Promise<void> => {
		const cfg = await getConfig();
		await cfg.db.migrateToLatest(await getDatabase());
	};

	const destroy = async (): Promise<void> => {
		await database?.destroy();
		database = undefined;
		config = undefined;
	};

	return {
		getConfig,
		getDatabase,
		migrate,
		destroy,
	};
};

export default getTestConfig;
