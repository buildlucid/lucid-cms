import loadConfigFile from "../../config/load-config-file.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import createMigrationLogger from "../logger/migration-logger.js";
import lucidServices from "../../../services/index.js";
import { confirm } from "@inquirer/prompts";
import type { Config } from "../../../types.js";

const runSyncTasks = async (
	config: Config,
	logger: ReturnType<typeof createMigrationLogger>,
	mode: "process" | "return" = "process",
): Promise<boolean> => {
	logger.syncTasksStart();

	const [localesResult, collectionsResult] = await Promise.all([
		lucidServices.sync.syncLocales({
			db: config.db.client,
			config: config,
			services: lucidServices,
		}),
		lucidServices.sync.syncCollections({
			db: config.db.client,
			config: config,
			services: lucidServices,
		}),
	]);

	if (localesResult.error) {
		logger.migrationFailed(localesResult.error, "locale sync");
		if (mode === "process") process.exit(1);
		else return false;
	}
	if (collectionsResult.error) {
		logger.migrationFailed(collectionsResult.error, "collections sync");
		if (mode === "process") process.exit(1);
		else return false;
	}

	logger.syncTasksComplete();
	return true;
};

const migrateCommand = (props?: {
	config?: Config;
	mode: "process" | "return";
}) => {
	return async (
		options: {
			skipSyncSteps?: boolean;
		} = {},
	) => {
		try {
			const overallStartTime = process.hrtime();
			const logger = createMigrationLogger();
			const mode = props?.mode ?? "process";
			const skipSyncSteps = options.skipSyncSteps ?? false;

			await installOptionalDeps();
			let config: Config;
			if (props?.config) {
				config = props.config;
			} else {
				const res = await loadConfigFile();
				config = res.config;
			}

			logger.migrationStart();

			//* check if collections need migrating
			const collectionMigrationResult =
				await lucidServices.collection.migrator.migrateCollections(
					{
						db: config.db.client,
						config: config,
						services: lucidServices,
					},
					{
						dryRun: true,
					},
				);

			let needsCollectionMigrations = false;
			if (collectionMigrationResult.error) {
				logger.warn(
					`Could not check collection migration status: ${collectionMigrationResult.error.message}`,
				);
				needsCollectionMigrations = true;
			} else {
				needsCollectionMigrations = collectionMigrationResult.data.some(
					(plan) => plan.tables.length > 0,
				);
			}

			//* check if the database needs migrating
			const needsDbMigrations = await config.db.needsMigration(
				config.db.client,
			);

			logger.migrationCheckStatus(needsDbMigrations, needsCollectionMigrations);

			//* if no migrations are needed, just run seeds and exit
			if (!needsCollectionMigrations && !needsDbMigrations) {
				logger.logsStart();
				if (!skipSyncSteps) {
					const syncResult = await runSyncTasks(config, logger, mode);
					if (!syncResult && mode === "return") {
						return false;
					}
				}
				logger.migrationComplete(overallStartTime);
				if (mode === "process") process.exit(0);
				else return true;
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
					if (mode === "process") process.exit(0);
					//* in the case we're returning, we want to exit the process. This is because this is used within the serve command
					else return false;
				}
				throw error;
			}
			if (!shouldProceed) {
				logger.migrationSkipped();
				if (mode === "process") process.exit(0);
				//* in the case we're returning, we want to exit the process. This is because this is used within the serve command
				else return false;
			}

			logger.logsStart();

			//* run database migrations if needed
			if (needsDbMigrations) {
				logger.dbMigrationStart();
				try {
					await config.db.migrateToLatest();
					logger.dbMigrationComplete();
				} catch (error) {
					logger.migrationFailed(error, "database migration");
					if (mode === "process") process.exit(1);
					else return false;
				}
			}

			//* run sync tasks (locales, collections)
			if (!skipSyncSteps) {
				const syncResult = await runSyncTasks(config, logger, mode);
				if (!syncResult && mode === "return") {
					return false;
				}
			}

			//* run collection migrations if needed
			if (needsCollectionMigrations) {
				logger.collectionMigrationStart();
				try {
					const result =
						await lucidServices.collection.migrator.migrateCollections(
							{
								db: config.db.client,
								config: config,
								services: lucidServices,
							},
							{ dryRun: false },
						);

					if (result.error) {
						logger.migrationFailed(
							result.error.message,
							"collection migrations",
						);
						if (mode === "process") process.exit(1);
						else return false;
					}
					logger.collectionMigrationComplete();
				} catch (error) {
					logger.migrationFailed(error, "collection migrations");
					if (mode === "process") process.exit(1);
					else return false;
				}
			}

			logger.migrationComplete(overallStartTime);
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
