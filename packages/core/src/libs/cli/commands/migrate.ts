import loadConfigFile from "../../config/load-config-file.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import createMigrationLogger from "../logger/migration-logger.js";
import lucidServices from "../../../services/index.js";
import { confirm } from "@inquirer/prompts";
import type { Config } from "../../../types.js";

const runSyncTasks = async (
	config: Config,
	logger: ReturnType<typeof createMigrationLogger>,
) => {
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
		process.exit(1);
	}
	if (collectionsResult.error) {
		logger.migrationFailed(collectionsResult.error, "collections sync");
		process.exit(1);
	}

	logger.syncTasksComplete();
};

const migrateCommand = async () => {
	try {
		const overallStartTime = process.hrtime();
		const logger = createMigrationLogger();

		await installOptionalDeps();
		const res = await loadConfigFile();

		logger.migrationStart();

		//* check if collections need migrating
		const collectionMigrationResult =
			await lucidServices.collection.migrator.migrateCollections(
				{
					db: res.config.db.client,
					config: res.config,
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
		const needsDbMigrations = await res.config.db.needsMigration(
			res.config.db.client,
		);

		logger.migrationCheckStatus(needsDbMigrations, needsCollectionMigrations);

		//* if no migrations are needed, just run seeds and exit
		if (!needsCollectionMigrations && !needsDbMigrations) {
			logger.logsStart();
			await runSyncTasks(res.config, logger);
			logger.migrationComplete(overallStartTime);
			process.exit(0);
		}

		//* migrations are needed - prompt the user
		console.log("");
		const shouldProceed = await confirm({
			message:
				"Migrations are needed to continue. Do you want to run them now?",
			default: true,
		});

		if (!shouldProceed) {
			logger.migrationSkipped();
			process.exit(0);
		}

		logger.logsStart();

		//* run database migrations if needed
		if (needsDbMigrations) {
			logger.dbMigrationStart();
			try {
				await res.config.db.migrateToLatest();
				logger.dbMigrationComplete();
			} catch (error) {
				logger.migrationFailed(error, "database migration");
				process.exit(1);
			}
		}

		//* run sync tasks (locales, collections)
		await runSyncTasks(res.config, logger);

		//* run collection migrations if needed
		if (needsCollectionMigrations) {
			logger.collectionMigrationStart();
			try {
				const result =
					await lucidServices.collection.migrator.migrateCollections(
						{
							db: res.config.db.client,
							config: res.config,
							services: lucidServices,
						},
						{ dryRun: false },
					);

				if (result.error) {
					logger.migrationFailed(result.error.message, "collection migrations");
					process.exit(1);
				}
				logger.collectionMigrationComplete();
			} catch (error) {
				logger.migrationFailed(error, "collection migrations");
				process.exit(1);
			}
		}

		logger.migrationComplete(overallStartTime);
		process.exit(0);
	} catch (error) {
		const logger = createMigrationLogger();
		logger.migrationFailed(error, "migration tasks");
		process.exit(1);
	}
};

export default migrateCommand;
