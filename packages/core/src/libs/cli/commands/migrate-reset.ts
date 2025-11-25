import { confirm } from "@inquirer/prompts";
import type { Config } from "../../../types.js";
import loadConfigFile from "../../config/load-config-file.js";
import getKVAdapter from "../../kv-adapter/get-adapter.js";
import logger from "../../logger/index.js";
import cliLogger from "../logger.js";
import validateEnvVars from "../services/validate-env-vars.js";

const migrateResetCommand = (props?: {
	config?: Config;
	mode: "process" | "return";
}) => {
	return async (options?: { force?: boolean }) => {
		try {
			logger.setBuffering(true);
			const startTime = cliLogger.startTimer();
			const mode = props?.mode ?? "process";
			const force = options?.force ?? false;

			let config: Config;
			if (props?.config) {
				config = props.config;
			} else {
				const res = await loadConfigFile();
				config = res.config;

				const envValid = await validateEnvVars({
					envSchema: res.envSchema,
					env: res.env,
				});

				if (!envValid) {
					if (mode === "process") {
						logger.setBuffering(false);
						process.exit(1);
					} else return false;
				}
			}

			cliLogger.warn("This will drop all database tables");

			if (!force) {
				let shouldProceed: boolean;
				try {
					shouldProceed = await confirm({
						message:
							"Are you sure you want to reset the database? This will drop ALL tables and cannot be undone.",
						default: false,
					});
				} catch (error) {
					if (error instanceof Error && error.name === "ExitPromptError") {
						if (mode === "process") {
							logger.setBuffering(false);
							process.exit(0);
						} else return false;
					}
					throw error;
				}

				if (!shouldProceed) {
					cliLogger.info("Reset cancelled");
					if (mode === "process") {
						logger.setBuffering(false);
						process.exit(0);
					} else return false;
				}
			}

			cliLogger.info("Dropping all database tables...");

			try {
				await config.db.dropAllTables();
				cliLogger.success(
					"All tables dropped",
					cliLogger.color.green("successfully"),
				);
			} catch (error) {
				cliLogger.error(
					"Failed to drop tables",
					error instanceof Error ? error.message : "Unknown error",
				);
				if (error instanceof Error) cliLogger.errorInstance(error);
				if (mode === "process") {
					logger.setBuffering(false);
					process.exit(1);
				} else return false;
			}

			cliLogger.info("Clearing KV cache...");
			const kvInstance = await getKVAdapter(config);
			await kvInstance.command.clear();

			const endTime = startTime();
			if (mode === "process") {
				cliLogger.log(
					cliLogger.createBadge("LUCID CMS"),
					"Database reset completed",
					cliLogger.color.green("successfully"),
					"in",
					cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
					{
						spaceAfter: true,
						spaceBefore: true,
					},
				);
				logger.setBuffering(false);
				process.exit(0);
			} else {
				cliLogger.success(
					"Database reset completed",
					cliLogger.color.green("successfully"),
					"in",
					cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
				);
				return true;
			}
		} catch (error) {
			cliLogger.error(
				"Database reset failed",
				error instanceof Error ? error.message : "Unknown error",
			);
			if (error instanceof Error) cliLogger.errorInstance(error);
			if (props?.mode === "process" || !props?.mode) {
				logger.setBuffering(false);
				process.exit(1);
			} else return false;
		}
	};
};

export default migrateResetCommand;
