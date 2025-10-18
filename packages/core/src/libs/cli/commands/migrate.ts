import { confirm } from "@inquirer/prompts";
import services from "../../../services/index.js";
import type { Config } from "../../../types.js";
import migrateCollections from "../../collection/migrate-collections.js";
import loadConfigFile from "../../config/load-config-file.js";
import passthroughKVAdapter from "../../kv-adapter/adapters/passthrough.js";
import getKVAdapter from "../../kv-adapter/get-adapter.js";
import type { KVAdapterInstance } from "../../kv-adapter/types.js";
import passthroughQueueAdapter from "../../queue-adapter/adapters/passthrough.js";
import createMigrationLogger from "../logger/migration-logger.js";
import validateEnvVars from "../utils/validate-env-vars.js";
import logger from "../../logger/index.js";

const runSyncTasks = async (
	config: Config,
	migrationLogger: ReturnType<typeof createMigrationLogger>,
	mode: "process" | "return",
	kvInstance?: KVAdapterInstance,
): Promise<boolean> => {
	migrationLogger.syncTasksStart();

	const kv = kvInstance ?? (await getKVAdapter(config));
	const queue = passthroughQueueAdapter();

	const [localesResult, collectionsResult] = await Promise.all([
		services.sync.syncLocales({
			db: config.db.client,
			config: config,
			queue: queue,
			env: null,
			kv: kv,
		}),
		services.sync.syncCollections({
			db: config.db.client,
			config: config,
			queue: queue,
			env: null,
			kv: kv,
		}),
	]);

	if (localesResult.error) {
		migrationLogger.migrationFailed(localesResult.error, "locale sync");
		if (mode === "process") {
			logger.setBuffering(false);
			process.exit(1);
		} else return false;
	}
	if (collectionsResult.error) {
		migrationLogger.migrationFailed(
			collectionsResult.error,
			"collections sync",
		);
		if (mode === "process") {
			logger.setBuffering(false);
			process.exit(1);
		} else return false;
	}

	migrationLogger.syncTasksComplete();
	return true;
};

const migrateCommand = (props?: {
	config?: Config;
	mode: "process" | "return";
}) => {
	return async (options?: {
		skipSyncSteps?: boolean;
		skipEnvValidation?: boolean;
	}) => {
		try {
			logger.setBuffering(true);
			const overallStartTime = process.hrtime();
			const migrationLogger = createMigrationLogger();
			const mode = props?.mode ?? "process";
			const skipSyncSteps = options?.skipSyncSteps ?? false;

			let config: Config;
			if (props?.config) {
				config = props.config;
			} else {
				const res = await loadConfigFile();
				config = res.config;

				if (options?.skipEnvValidation !== true) {
					const envValid = await validateEnvVars({
						envSchema: res.envSchema,
						env: res.env,
					});

					if (!envValid.success) {
						migrationLogger.envValidationFailed(envValid.message);
						process.exit(1);
					}
				}
			}

			const queue = passthroughQueueAdapter();

			migrationLogger.migrationStart();

			//* check if collections need migrating
			const collectionMigrationResult = await migrateCollections(
				{
					db: config.db.client,
					config: config,
					queue: queue,
					env: null,
					kv: passthroughKVAdapter(),
				},
				{
					dryRun: true,
				},
			);

			let needsCollectionMigrations = false;
			if (collectionMigrationResult.error) {
				migrationLogger.warn(
					`Could not check collection migration status: ${collectionMigrationResult.error.message}`,
				);
				needsCollectionMigrations = true;
			} else {
				needsCollectionMigrations =
					collectionMigrationResult.data.migrationPlans.some(
						(plan) => plan.tables.length > 0,
					);
			}

			//* check if the database needs migrating
			const needsDbMigrations = await config.db.needsMigration(
				config.db.client,
			);

			migrationLogger.migrationCheckStatus(
				needsDbMigrations,
				needsCollectionMigrations,
			);

			//* if no migrations are needed, just run seeds and exit
			if (!needsCollectionMigrations && !needsDbMigrations) {
				if (!skipSyncSteps) {
					migrationLogger.logsStart();
					const syncResult = await runSyncTasks(config, migrationLogger, mode);
					if (!syncResult && mode === "return") {
						return false;
					}
				}
				migrationLogger.migrationComplete(overallStartTime);
				if (mode === "process") {
					logger.setBuffering(false);
					process.exit(0);
				} else return true; //* dont clear logger buffer here as it was called by the serve command
			}

			//* migrations are needed - prompt the user
			console.log("");
			let shouldProceed: boolean;
			try {
				shouldProceed = await confirm({
					message:
						"Migrations are needed to continue. Do you want to run them now?",
					default: true,
				});
			} catch (error) {
				if (error instanceof Error && error.name === "ExitPromptError") {
					if (mode === "process") {
						logger.setBuffering(false);
						process.exit(0);
					}
					//* in the case we're returning, we want to exit the process. This is because this is used within the serve command
					else return false;
				}
				throw error;
			}
			if (!shouldProceed) {
				migrationLogger.migrationSkipped();
				if (mode === "process") {
					logger.setBuffering(false);
					process.exit(0);
				}
				//* in the case we're returning, we want to exit the process. This is because this is used within the serve command
				else return false;
			}

			const kvInstance = await getKVAdapter(config);

			migrationLogger.logsStart();

			//* run database migrations if needed
			if (needsDbMigrations) {
				migrationLogger.dbMigrationStart();
				try {
					await config.db.migrateToLatest();
					migrationLogger.dbMigrationComplete();
				} catch (error) {
					migrationLogger.migrationFailed(error, "database migration");
					if (mode === "process") {
						logger.setBuffering(false);
						process.exit(1);
					} else return false;
				}
			}

			//* run sync tasks (locales, collections). We dont skip these as migrations are being ran also.
			const syncResult = await runSyncTasks(
				config,
				migrationLogger,
				mode,
				kvInstance,
			);
			if (!syncResult && mode === "return") {
				return false;
			}

			//* run collection migrations if needed
			if (needsCollectionMigrations) {
				migrationLogger.collectionMigrationStart();
				try {
					const result = await migrateCollections(
						{
							db: config.db.client,
							config: config,
							queue: queue,
							env: null,
							kv: kvInstance,
						},
						{ dryRun: false },
					);

					if (result.error) {
						migrationLogger.migrationFailed(
							result.error.message,
							"collection migrations",
						);
						if (mode === "process") {
							logger.setBuffering(false);
							process.exit(1);
						} else return false;
					}
					migrationLogger.collectionMigrationComplete();
				} catch (error) {
					migrationLogger.migrationFailed(error, "collection migrations");
					if (mode === "process") {
						logger.setBuffering(false);
						process.exit(1);
					} else return false;
				}
			}

			migrationLogger.clearingKVCache();
			await kvInstance.command.clear();

			migrationLogger.migrationComplete(overallStartTime);
			if (mode === "process") process.exit(0);
			else return true;
		} catch (error) {
			const logger = createMigrationLogger();
			logger.migrationFailed(error, "migration tasks");
			if (props?.mode === "process" || !props?.mode) process.exit(1);
			else return false;
		}
	};
};

export default migrateCommand;
