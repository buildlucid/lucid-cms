import { confirm } from "@inquirer/prompts";
import type { Config, EnvironmentVariables } from "../../../types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import loadConfigFile from "../../config/load-config-file.js";
import type { DatabaseConnection } from "../../db/types.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import type { TranslationStore } from "../../i18n/types.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import cliLogger from "../logger.js";
import validateEnvVars from "../services/validate-env-vars.js";

const migrateResetCommand = (props?: {
	config?: Config;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
	translationStore?: TranslationStore;
	mode: "process" | "return";
}) => {
	return async (options?: { force?: boolean; remote?: boolean }) => {
		let kvInstance: KVAdapterInstance | undefined;
		let config: Config | undefined;
		let env: EnvironmentVariables | undefined = props?.env;
		let runtimeContext: AdapterRuntimeContext | undefined =
			props?.runtimeContext;
		let translationStore: TranslationStore | undefined;
		let database: DatabaseConnection | undefined;

		const cleanup = async () => {
			if (!config) return;
			await Promise.allSettled([
				database?.destroy(),
				destroyKVAdapter(kvInstance, { config, env, runtimeContext }),
			]);
			database = undefined;
			kvInstance = undefined;
		};

		try {
			startLoggerBuffering();
			const startTime = cliLogger.startTimer();
			const mode = props?.mode ?? "process";
			const force = options?.force ?? false;

			if (props?.config) {
				config = props.config;
				translationStore = props.translationStore;
			} else {
				const res = await loadConfigFile({
					prepareRuntime: true,
				});
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
						await stopLoggerBuffering();
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
							await stopLoggerBuffering();
							process.exit(0);
						} else return false;
					}
					throw error;
				}

				if (!shouldProceed) {
					cliLogger.info("Reset cancelled");
					if (mode === "process") {
						await stopLoggerBuffering();
						process.exit(0);
					} else return false;
				}
			}

			cliLogger.info("Dropping all database tables...");

			try {
				database = await config.db.connect(env);
				await config.db.dropAllTables(database);
				cliLogger.success(
					"All tables dropped",
					cliLogger.color.green("successfully"),
				);
			} catch (error) {
				if (error instanceof Error) {
					cliLogger.errorInstance(error, "Failed to drop tables");
				} else {
					cliLogger.error("Failed to drop tables", "Unknown error");
				}
				await cleanup();
				if (mode === "process") {
					await stopLoggerBuffering();
					process.exit(1);
				} else return false;
			}

			cliLogger.info("Clearing KV cache...");
			kvInstance = await getInitializedKVAdapter(config, {
				env,
				runtimeContext,
			});
			await kvInstance.clear(
				createServiceContext({
					config,
					database,
					translationStore,
					env,
					runtimeContext,
					kv: kvInstance,
				}),
			);
			await cleanup();

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
				await stopLoggerBuffering();
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
			await cleanup();
			if (error instanceof Error) {
				cliLogger.errorInstance(error, "Database reset failed");
			} else {
				cliLogger.error("Database reset failed", "Unknown error");
			}
			if (props?.mode === "process" || !props?.mode) {
				await stopLoggerBuffering();
				process.exit(1);
			} else return false;
		}
	};
};

export default migrateResetCommand;
