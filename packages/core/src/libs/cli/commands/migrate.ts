import { confirm } from "@inquirer/prompts";
import { syncServices } from "../../../services/index.js";
import type {
	Config,
	EnvironmentVariables,
	ServiceContext,
} from "../../../types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import applyCollectionMigrations from "../../collection/apply-collection-migrations.js";
import assessMigrationPlans from "../../collection/migration/assess-migration-plan.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import loadConfigFile from "../../config/load-config-file.js";
import { prepareExternalMigrations } from "../../db/load-external-migrations.js";
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
import {
	type MigrationApprovalAction,
	requiresPostMigrationApproval,
	resolveMigrationApproval,
} from "../services/migration-approval.js";
import { reportMigrationAssessment } from "../services/migration-report.js";
import runSyncTasks from "../services/run-sync-tasks.js";
import validateEnvVars from "../services/validate-env-vars.js";

type MigrateCommandOptions = {
	skipSyncSteps?: boolean;
	skipEnvValidation?: boolean;
	yes?: boolean;
	allowDestructive?: boolean;
	remote?: boolean;
};

/** Runs an interactive approval gate and reports non-interactive policy errors. */
const requestMigrationApproval = async (
	action: MigrationApprovalAction,
): Promise<boolean> => {
	if (action === "proceed") return true;
	if (action === "reject-destructive") {
		cliLogger.error(
			"--yes does not authorize destructive collection migrations. Re-run with --allow-destructive if you accept the risk of permanent data loss.",
		);
		return false;
	}

	const destructive = action === "prompt-destructive";
	try {
		return await confirm({
			message: destructive
				? "These collection migrations may permanently delete stored data. Do you want to continue?"
				: "These migrations require review. Do you want to continue?",
			default: false,
		});
	} catch (error) {
		if (error instanceof Error && error.name === "ExitPromptError")
			return false;
		throw error;
	}
};

/** Runs database and risk-aware collection migrations for CLI/runtime callers. */
const migrateCommand = (props?: {
	config?: Config;
	env?: EnvironmentVariables;
	runtimeContext?: AdapterRuntimeContext;
	translationStore?: TranslationStore;
	projectRoot?: string;
	mode: "process" | "return";
}) => {
	return async (options?: MigrateCommandOptions) => {
		let config: Config | undefined;
		let env: EnvironmentVariables | undefined = props?.env;
		let runtimeContext: AdapterRuntimeContext | undefined =
			props?.runtimeContext;
		let translationStore: TranslationStore | undefined;
		let kvInstance: KVAdapterInstance | undefined;
		let database: DatabaseConnection | undefined;
		const mode = props?.mode ?? "process";

		/** Destroys adapters initialized during this migration command. */
		const cleanupAdapters = async (): Promise<void> => {
			if (config) {
				await Promise.allSettled([
					database?.destroy(),
					destroyKVAdapter(kvInstance, {
						config,
						env,
						runtimeContext,
					}),
				]);
			}
			database = undefined;
			kvInstance = undefined;
		};

		/** Stops the command with the requested process status or a false result. */
		const stopCommand = async (exitCode: number): Promise<false> => {
			await cleanupAdapters();
			if (mode === "process") {
				await stopLoggerBuffering();
				process.exit(exitCode);
			}
			return false;
		};

		try {
			startLoggerBuffering();
			const startTime = cliLogger.startTimer();
			const skipSyncSteps = options?.skipSyncSteps ?? false;
			const yes = options?.yes ?? false;
			const allowDestructive = options?.allowDestructive ?? false;
			let projectRoot = props?.projectRoot;

			//* preflight: load and validate the project, then prepare all migrations
			if (props?.config) {
				config = props.config;
				translationStore = props.translationStore;
			} else {
				const res = await loadConfigFile({ prepareRuntime: true });
				config = res.config;
				env = res.env;
				runtimeContext = res.runtimeContext;
				projectRoot = res.projectRoot;
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
					if (!envValid) return await stopCommand(1);
				}
			}
			if (!config || !translationStore) {
				throw new Error("Lucid could not resolve its migration configuration.");
			}
			database = await config.db.connect(env);

			await prepareExternalMigrations(config, projectRoot);

			const preflightContext = createServiceContext({
				config,
				database,
				translationStore,
				env,
				runtimeContext,
			});

			cliLogger.info("Checking the migration status");
			const initialPlanResult =
				await planCollectionMigrations(preflightContext);
			if (initialPlanResult.error) {
				cliLogger.error(
					"Could not plan collection migrations:",
					preflightContext.translate.english(initialPlanResult.error.message) ||
						"Unknown error",
				);
				return await stopCommand(1);
			}
			const initialAssessment = assessMigrationPlans(
				initialPlanResult.data.collections.map(
					({ migrationPlan }) => migrationPlan,
				),
			);
			const needsCollectionMigrations = initialAssessment.reasons.length > 0;
			const needsDatabaseMigrations = await config.db.needsMigration(
				database.client,
			);

			if (needsDatabaseMigrations) {
				cliLogger.warn(
					"Database schema migrations are pending and require approval because their migration bodies cannot be classified.",
				);
			}
			if (needsCollectionMigrations) {
				reportMigrationAssessment(initialAssessment);
			}

			//* no-op path: keep sync behavior but avoid initializing migration adapters
			if (!needsDatabaseMigrations && !needsCollectionMigrations) {
				cliLogger.success("No migrations are required");
				if (!skipSyncSteps) {
					const syncResult = await runSyncTasks({
						config,
						database,
						translationStore,
						env,
						runtimeContext,
					});
					if (!syncResult) return await stopCommand(1);
				}

				const endTime = startTime();
				cliLogger.success(
					"Migrations completed",
					cliLogger.color.green("successfully"),
					"in",
					cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
				);
				await cleanupAdapters();
				if (mode === "process") {
					await stopLoggerBuffering();
					process.exit(0);
				}
				return true;
			}

			//* approval: safe collection-only plans bypass this gate
			const initialApproval = resolveMigrationApproval({
				assessment: initialAssessment,
				hasPendingDatabaseMigrations: needsDatabaseMigrations,
				yes,
				allowDestructive,
			});
			const initiallyApproved = await requestMigrationApproval(initialApproval);
			if (!initiallyApproved) {
				if (initialApproval === "reject-destructive") {
					return await stopCommand(1);
				}
				cliLogger.info("Exiting without running migrations.");
				return await stopCommand(0);
			}

			kvInstance = await getInitializedKVAdapter(config, {
				env,
				runtimeContext,
			});
			const executionContext: ServiceContext = {
				...preflightContext,
				kv: kvInstance,
			};

			//* execution: arbitrary database migrations run before collection re-planning
			if (needsDatabaseMigrations) {
				cliLogger.info("Running database schema migrations...");
				await config.db.migrateToLatest(database);
				cliLogger.success(
					"Schema migrations completed",
					cliLogger.color.green("successfully"),
				);
			}

			const exactPlanResult = needsDatabaseMigrations
				? await planCollectionMigrations(executionContext)
				: initialPlanResult;
			if (exactPlanResult.error) {
				cliLogger.error(
					"Could not re-plan collection migrations after database migrations:",
					executionContext.translate.english(exactPlanResult.error.message) ||
						"Unknown error",
				);
				return await stopCommand(1);
			}
			const exactAssessment = assessMigrationPlans(
				exactPlanResult.data.collections.map(
					({ migrationPlan }) => migrationPlan,
				),
			);

			if (needsDatabaseMigrations && exactAssessment.reasons.length > 0) {
				cliLogger.info("Post-migration collection plan:");
				reportMigrationAssessment(exactAssessment);
			}

			if (
				needsDatabaseMigrations &&
				requiresPostMigrationApproval(initialAssessment, exactAssessment)
			) {
				cliLogger.warn(
					"The collection migration risk increased after database migrations ran.",
				);
				const increasedRiskApproval = resolveMigrationApproval({
					assessment: exactAssessment,
					hasPendingDatabaseMigrations: false,
					yes,
					allowDestructive,
				});
				const increasedRiskApproved = await requestMigrationApproval(
					increasedRiskApproval,
				);
				if (!increasedRiskApproved) {
					return await stopCommand(
						increasedRiskApproval === "reject-destructive" ? 1 : 0,
					);
				}
			}

			const exactCollectionMigrations = exactAssessment.reasons.length > 0;
			if (exactCollectionMigrations) {
				const preCollectionSyncResult =
					await syncServices.syncCollections(executionContext);
				if (preCollectionSyncResult.error) {
					cliLogger.error(
						"Sync failed during pre-migration collection sync:",
						executionContext.translate.english(
							preCollectionSyncResult.error.message,
						) || "Unknown error",
					);
					return await stopCommand(1);
				}

				cliLogger.info("Running collection migrations...");
				const migrationResult = await applyCollectionMigrations(
					executionContext,
					exactPlanResult.data,
				);
				if (migrationResult.error) {
					cliLogger.error(
						"Collection migrations failed:",
						executionContext.translate.english(migrationResult.error.message) ||
							"Unknown error",
					);
					return await stopCommand(1);
				}
				cliLogger.success(
					"Collection migrations completed",
					cliLogger.color.green("successfully"),
				);
			}

			//* sync and cache clearing run only after the exact plan has succeeded
			if (!skipSyncSteps) {
				const syncResult = await runSyncTasks({
					config,
					database,
					translationStore,
					kv: kvInstance,
					env,
					runtimeContext,
				});
				if (!syncResult) return await stopCommand(1);
			}

			cliLogger.info("Clearing KV cache...");
			await kvInstance.clear(
				createServiceContext({
					config,
					database,
					translationStore,
					env,
					runtimeContext,
					queue: executionContext.queue,
					kv: kvInstance,
					media: executionContext.media,
					email: executionContext.email,
				}),
			);

			const endTime = startTime();
			await cleanupAdapters();
			if (mode === "process") {
				cliLogger.log(
					cliLogger.createBadge("LUCID CMS"),
					"Migrations completed",
					cliLogger.color.green("successfully"),
					"in",
					cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
					{ spaceAfter: true, spaceBefore: true },
				);
				await stopLoggerBuffering();
				process.exit(0);
			}

			cliLogger.success(
				"Migrations completed",
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
			);
			return true;
		} catch (error) {
			if (error instanceof Error) {
				cliLogger.errorInstance(error, "Migration failed");
			} else {
				cliLogger.error("Migration failed", "Unknown error");
			}
			return await stopCommand(1);
		}
	};
};

export default migrateCommand;
