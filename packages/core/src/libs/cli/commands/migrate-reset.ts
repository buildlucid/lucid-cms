import { confirm } from "@inquirer/prompts";
import type { Config, EnvironmentVariables } from "../../../types.js";
import loadConfigFile from "../../config/load-config-file.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import type { TranslationStore } from "../../i18n/types.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import logger from "../../logger/index.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import { createToolkitServiceContext } from "../../toolkit/config.js";
import cliLogger from "../logger.js";
import validateEnvVars from "../services/validate-env-vars.js";

const migrateResetCommand = (props?: {
	config?: Config;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
	translationStore?: TranslationStore;
	mode: "process" | "return";
}) => {
	return async (options?: { force?: boolean }) => {
		let kvInstance: KVAdapterInstance | undefined;
		let config: Config | undefined;
		let env: EnvironmentVariables | undefined = props?.env;
		let runtimeContext: AdapterRuntimeContext | undefined =
			props?.runtimeContext;
		let translationStore: TranslationStore | undefined;

		try {
			logger.setBuffering(true);
			const startTime = cliLogger.startTimer();
			const mode = props?.mode ?? "process";
			const force = options?.force ?? false;

			if (props?.config) {
				config = props.config;
				translationStore = props.translationStore;
			} else {
				const res = await loadConfigFile();
				config = res.config;
				env = res.env;
				runtimeContext = res.runtimeContext;
				translationStore = (
					await prepareTranslations({
						config,
						projectRoot: res.projectRoot,
					})
				).translationStore;

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
			if (!translationStore) {
				throw new Error("Lucid could not resolve the translation store.");
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
			kvInstance = await getInitializedKVAdapter(config, {
				env,
				runtimeContext,
			});
			await kvInstance.clear(
				createToolkitServiceContext({
					config,
					translationStore,
					env,
					runtimeContext,
					kv: kvInstance,
				}),
			);
			await destroyKVAdapter(kvInstance, { config, env, runtimeContext });
			kvInstance = undefined;

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
			if (config && translationStore) {
				await destroyKVAdapter(kvInstance, { config, env, runtimeContext });
			}
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
