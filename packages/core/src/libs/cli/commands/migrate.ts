import { confirm } from "@inquirer/prompts";
import constants from "../../../constants/constants.js";
import { syncServices } from "../../../services/index.js";
import type { Config, EnvironmentVariables } from "../../../types.js";
import migrateCollections from "../../collection/migrate-collections.js";
import loadConfigFile from "../../config/load-config-file.js";
import {
	destroyEmailAdapter,
	getInitializedEmailAdapter,
} from "../../email/lifecycle.js";
import type { EmailAdapterInstance } from "../../email/types.js";
import { createTranslator } from "../../i18n/index.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import type { TranslationStore } from "../../i18n/types.js";
import passthroughKVAdapter from "../../kv/adapters/passthrough.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import logger from "../../logger/index.js";
import {
	destroyMediaAdapter,
	getInitializedMediaAdapter,
} from "../../media/lifecycle.js";
import type { MediaAdapterInstance } from "../../media/types.js";
import passthroughQueueAdapter from "../../queue/adapters/passthrough.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import { createToolkitServiceContext } from "../../toolkit/config.js";
import cliLogger from "../logger.js";
import runSyncTasks from "../services/run-sync-tasks.js";
import validateEnvVars from "../services/validate-env-vars.js";

const migrateCommand = (props?: {
	config?: Config;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
	translationStore?: TranslationStore;
	mode: "process" | "return";
}) => {
	return async (options?: {
		skipSyncSteps?: boolean;
		skipEnvValidation?: boolean;
		force?: boolean;
		remote?: boolean;
	}) => {
		let config: Config | undefined;
		let env: EnvironmentVariables | undefined = props?.env;
		let runtimeContext: AdapterRuntimeContext | undefined =
			props?.runtimeContext;
		let translationStore: TranslationStore | undefined;
		let kvInstance: KVAdapterInstance | undefined;
		let mediaInstance: MediaAdapterInstance | null | undefined;
		let emailInstance: EmailAdapterInstance | undefined;

		const cleanupAdapters = async () => {
			if (config && translationStore) {
				await Promise.allSettled([
					destroyKVAdapter(kvInstance, {
						config,
						env,
						runtimeContext,
					}),
					destroyMediaAdapter(mediaInstance, {
						config,
						env,
						runtimeContext,
					}),
					destroyEmailAdapter(emailInstance, {
						config,
						env,
						runtimeContext,
					}),
				]);
			}
			kvInstance = undefined;
			mediaInstance = undefined;
			emailInstance = undefined;
		};

		try {
			logger.setBuffering(true);
			const startTime = cliLogger.startTimer();
			const mode = props?.mode ?? "process";
			const skipSyncSteps = options?.skipSyncSteps ?? false;
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
			if (!translationStore) {
				throw new Error("Lucid could not resolve the translation store.");
			}

			const queue = passthroughQueueAdapter();
			const translate = createTranslator({
				store: translationStore,
				locale: "en",
			});
			[mediaInstance, emailInstance] = await Promise.all([
				getInitializedMediaAdapter(config, { env, runtimeContext }),
				getInitializedEmailAdapter(config, { env, runtimeContext }),
			]);
			const media = mediaInstance;
			const email = emailInstance;

			cliLogger.info("Checking the migration status");

			//* check if collections need migrating
			const collectionMigrationResult = await migrateCollections(
				{
					db: { client: config.db.client },
					config: config,
					queue: queue,
					env: env ?? null,
					runtimeContext,
					kv: passthroughKVAdapter(),
					media,
					email,
					translate,
					request: {
						url: config.host ?? constants.urls.localhost,
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
					`Could not check collection migration status: ${translate.english(collectionMigrationResult.error.message) || "Unknown error"}`,
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
					const syncResult = await runSyncTasks(
						config,
						translationStore,
						mode,
						undefined,
						env,
						runtimeContext,
					);
					if (!syncResult && mode === "return") {
						await cleanupAdapters();
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
					await cleanupAdapters();
					process.exit(0);
				} else {
					cliLogger.success(
						"Migrations completed",
						cliLogger.color.green("successfully"),
						"in",
						cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
					);
					await cleanupAdapters();
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
							await cleanupAdapters();
							logger.setBuffering(false);
							process.exit(0);
						}
						//* in the case we're returning, we want to exit the process. This is because this is used within the serve command
						else {
							await cleanupAdapters();
							return false;
						}
					}
					throw error;
				}
				if (!shouldProceed) {
					cliLogger.info(
						"Exiting without running migrations. Run this command again when you're ready",
					);
					if (mode === "process") {
						await cleanupAdapters();
						logger.setBuffering(false);
						process.exit(0);
					}
					//* in the case we're returning, we want to exit the process. This is because this is used within the serve command
					else {
						await cleanupAdapters();
						return false;
					}
				}
			}

			kvInstance = await getInitializedKVAdapter(config, {
				env,
				runtimeContext,
			});

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
						await cleanupAdapters();
						logger.setBuffering(false);
						process.exit(1);
					} else {
						await cleanupAdapters();
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
					env: env ?? null,
					runtimeContext,
					kv: kvInstance,
					media,
					email,
					translate,
					request: {
						url: config.host ?? constants.urls.localhost,
						locale: "en",
					},
				});
				if (preCollectionSyncResult.error) {
					cliLogger.error(
						"Sync failed during pre-migration collection sync, with error:",
						translate.english(preCollectionSyncResult.error.message) ||
							"unknown",
					);
					if (mode === "process") {
						await cleanupAdapters();
						logger.setBuffering(false);
						process.exit(1);
					} else {
						await cleanupAdapters();
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
							env: env ?? null,
							runtimeContext,
							kv: kvInstance,
							media,
							email,
							translate,
							request: {
								url: config.host ?? constants.urls.localhost,
								locale: "en",
							},
						},
						{ dryRun: false },
					);

					if (result.error) {
						cliLogger.error(
							"Migration failed on step collection migrations",
							translate.english(result.error.message) ? "with error:" : "",
							translate.english(result.error.message) || "",
						);
						if (mode === "process") {
							await cleanupAdapters();
							logger.setBuffering(false);
							process.exit(1);
						} else {
							await cleanupAdapters();
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
						await cleanupAdapters();
						logger.setBuffering(false);
						process.exit(1);
					} else {
						await cleanupAdapters();
						return false;
					}
				}
			}

			//* run sync tasks after migrations so sync can rely on latest schema changes
			if (!skipSyncSteps) {
				const syncResult = await runSyncTasks(
					config,
					translationStore,
					mode,
					kvInstance,
					env,
					runtimeContext,
				);
				if (!syncResult && mode === "return") {
					await cleanupAdapters();
					return false;
				}
			}

			cliLogger.info("Clearing KV cache...");
			await kvInstance.clear(
				createToolkitServiceContext({
					config,
					translationStore,
					env,
					runtimeContext,
					queue,
					kv: kvInstance,
					media,
					email,
				}),
			);
			await cleanupAdapters();

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
			await cleanupAdapters();
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
