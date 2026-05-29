import { confirm } from "@inquirer/prompts";
import { syncServices } from "../../../services/index.js";
import type { Config } from "../../../types.js";
import migrateCollections from "../../collection/migrate-collections.js";
import loadConfigFile from "../../config/load-config-file.js";
import { createTranslator } from "../../i18n/index.js";
import passthroughKVAdapter from "../../kv/adapters/passthrough.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import logger from "../../logger/index.js";
import passthroughQueueAdapter from "../../queue/adapters/passthrough.js";
import cliLogger from "../logger.js";
import runSyncTasks from "../services/run-sync-tasks.js";
import validateEnvVars from "../services/validate-env-vars.js";

const migrateCommand = (props?: {
	config?: Config;
	mode: "process" | "return";
}) => {
	return async (options?: {
		skipSyncSteps?: boolean;
		skipEnvValidation?: boolean;
		force?: boolean;
	}) => {
		let kvInstance: KVAdapterInstance | undefined;
		let config: Config | undefined;
		const cleanupKV = async () => {
			if (config) await destroyKVAdapter(kvInstance, { config });
			kvInstance = undefined;
		};

		try {
			logger.setBuffering(true);
			const startTime = cliLogger.startTimer();
			const mode = props?.mode ?? "process";
			const skipSyncSteps = options?.skipSyncSteps ?? false;
			const force = options?.force ?? false;

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

					if (!envValid) {
						logger.setBuffering(false);
						process.exit(1);
					}
				}
			}

			const queue = passthroughQueueAdapter();
			const translate = createTranslator({ config, locale: "en" });

			cliLogger.info("Checking the migration status");

			//* check if collections need migrating
			const collectionMigrationResult = await migrateCollections(
				{
					db: { client: config.db.client },
					config: config,
					queue: queue,
					env: null,
					kv: passthroughKVAdapter(),
					translate,
					request: {
						url: config.baseUrl ?? "",
						locale: "en",
					},
				},
				{
					dryRun: true,
				},
			);

			let needsCollectionMigrations = false;
			if (collectionMigrationResult.error) {
				cliLogger.warn(
					`Could not check collection migration status: ${translate.english.text(collectionMigrationResult.error.message) || "Unknown error"}`,
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

			if (needsDbMigrations) {
				cliLogger.info("Database schema migrations are pending");
			}
			if (needsCollectionMigrations) {
				cliLogger.info("Collection/brick table migrations are needed");
			}
			if (!needsDbMigrations && !needsCollectionMigrations) {
				cliLogger.success("No migrations are required");
			}

			//* if no migrations are needed, just run seeds and exit
			if (!needsCollectionMigrations && !needsDbMigrations) {
				if (!skipSyncSteps) {
					const syncResult = await runSyncTasks(config, mode);
					if (!syncResult && mode === "return") {
						return false;
					}
				}
				const endTime = startTime();
				if (mode === "process") {
					cliLogger.log(
						cliLogger.createBadge("LUCID CMS"),
						"Migrations completed",
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
						"Migrations completed",
						cliLogger.color.green("successfully"),
						"in",
						cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
					);
					return true; //* dont clear logger buffer here as it was called by the serve command
				}
			}

			//* migrations are needed - prompt the user
			if (!force) {
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
					cliLogger.info(
						"Exiting without running migrations. Run this command again when you're ready",
					);
					if (mode === "process") {
						logger.setBuffering(false);
						process.exit(0);
					}
					//* in the case we're returning, we want to exit the process. This is because this is used within the serve command
					else return false;
				}
			}

			kvInstance = await getInitializedKVAdapter(config);

			//* run database migrations if needed
			if (needsDbMigrations) {
				cliLogger.info("Running database schema migrations...");
				try {
					await config.db.migrateToLatest();
					cliLogger.success(
						"Schema migrations completed",
						cliLogger.color.green("successfully"),
					);
				} catch (error) {
					cliLogger.error(
						"Migration failed",
						error instanceof Error ? error.message : "Unknown error",
					);
					if (error instanceof Error) cliLogger.errorInstance(error);
					if (mode === "process") {
						await cleanupKV();
						logger.setBuffering(false);
						process.exit(1);
					} else {
						await cleanupKV();
						return false;
					}
				}
			}

			//* run collections sync before collection migrations
			if (needsCollectionMigrations) {
				const preCollectionSyncResult = await syncServices.syncCollections({
					db: { client: config.db.client },
					config: config,
					queue: queue,
					env: null,
					kv: kvInstance,
					translate,
					request: {
						url: config.baseUrl ?? "",
						locale: "en",
					},
				});
				if (preCollectionSyncResult.error) {
					cliLogger.error(
						"Sync failed during pre-migration collection sync, with error:",
						translate.english.text(preCollectionSyncResult.error.message) ||
							"unknown",
					);
					if (mode === "process") {
						await cleanupKV();
						logger.setBuffering(false);
						process.exit(1);
					} else {
						await cleanupKV();
						return false;
					}
				}
			}

			//* run collection migrations if needed
			if (needsCollectionMigrations) {
				cliLogger.info("Running collection migrations...");
				try {
					const result = await migrateCollections(
						{
							db: { client: config.db.client },
							config: config,
							queue: queue,
							env: null,
							kv: kvInstance,
							translate,
							request: {
								url: config.baseUrl ?? "",
								locale: "en",
							},
						},
						{ dryRun: false },
					);

					if (result.error) {
						cliLogger.error(
							"Migration failed on step collection migrations",
							translate.english.text(result.error.message) ? "with error:" : "",
							translate.english.text(result.error.message) || "",
						);
						if (mode === "process") {
							await cleanupKV();
							logger.setBuffering(false);
							process.exit(1);
						} else {
							await cleanupKV();
							return false;
						}
					}
					cliLogger.success(
						"Collection migrations completed",
						cliLogger.color.green("successfully"),
					);
				} catch (error) {
					cliLogger.error(
						"Migration failed",
						error instanceof Error ? error.message : "Unknown error",
					);
					if (error instanceof Error) cliLogger.errorInstance(error);
					if (mode === "process") {
						await cleanupKV();
						logger.setBuffering(false);
						process.exit(1);
					} else {
						await cleanupKV();
						return false;
					}
				}
			}

			//* run sync tasks after migrations so sync can rely on latest schema changes
			if (!skipSyncSteps) {
				const syncResult = await runSyncTasks(config, mode, kvInstance);
				if (!syncResult && mode === "return") {
					await cleanupKV();
					return false;
				}
			}

			cliLogger.info("Clearing KV cache...");
			await kvInstance.clear();
			await cleanupKV();

			const endTime = startTime();
			if (mode === "process") {
				cliLogger.log(
					cliLogger.createBadge("LUCID CMS"),
					"Migrations completed",
					cliLogger.color.green("successfully"),
					"in",
					cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
					{
						spaceAfter: true,
						spaceBefore: true,
					},
				);
				process.exit(0);
			} else {
				cliLogger.success(
					"Migrations completed",
					cliLogger.color.green("successfully"),
					"in",
					cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
				);
				return true;
			}
		} catch (error) {
			await cleanupKV();
			cliLogger.error(
				"Migration failed",
				error instanceof Error ? error.message : "Unknown error",
			);
			if (error instanceof Error) cliLogger.errorInstance(error);
			if (props?.mode === "process" || !props?.mode) process.exit(1);
			else return false;
		}
	};
};

export default migrateCommand;
