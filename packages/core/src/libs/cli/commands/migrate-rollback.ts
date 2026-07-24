import { confirm } from "@inquirer/prompts";
import { sql } from "kysely";
import { Migrator } from "kysely/migration";
import constants from "../../../constants/constants.js";
import type { Config, EnvironmentVariables } from "../../../types.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
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
import logger, {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import cliLogger from "../logger.js";
import validateEnvVars from "../services/validate-env-vars.js";

const migrateRollbackCommand = async (options?: {
	force?: boolean;
	remote?: boolean;
	steps?: number;
}) => {
	let kvInstance: KVAdapterInstance | undefined;
	let config: Config | undefined;
	let env: EnvironmentVariables | undefined;
	let runtimeContext: AdapterRuntimeContext | undefined;
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
		const steps = options?.steps ?? 1;
		const force = options?.force ?? false;

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
			await cleanup();
			await stopLoggerBuffering();
			process.exit(1);
		}

		cliLogger.info("Checking rollback status");

		await prepareExternalMigrations(config, res.projectRoot);
		database = await config.db.connect(env);

		const migrator = new Migrator({
			db: database.client,
			provider: {
				async getMigrations() {
					return res.config.db.migrations;
				},
			},
			//* required so new core migrations can run after external migrations have executed
			allowUnorderedMigrations: true,
		});

		//* executed migrations that are no longer registered would fail the rollback midway, so surface them upfront
		const availableMigrationNames = Object.keys(res.config.db.migrations);
		let executedMigrationNames: string[] = [];
		try {
			const executedRows = await sql<{ name: string }>`
				SELECT name FROM kysely_migration
			`.execute(database.client);
			executedMigrationNames = executedRows.rows.map((row) => row.name);
		} catch (_) {
			//* the migration table doesnt exist yet - no migrations to rollback
		}

		const missingMigrations = executedMigrationNames.filter(
			(name) => !availableMigrationNames.includes(name),
		);
		if (missingMigrations.length > 0) {
			cliLogger.error(
				`Cannot rollback: previously executed migration(s) are no longer registered: ${missingMigrations.join(", ")}`,
			);
			cliLogger.info(
				"If you removed a plugin or migration file, restore it so its migrations can be rolled back.",
			);
			await cleanup();
			await stopLoggerBuffering();
			process.exit(1);
		}

		const migrations = await migrator.getMigrations();
		//* rollbacks happen in execution order, which can diverge from name order with external migrations
		const executedMigrations = migrations
			.filter((m) => m.executedAt !== undefined)
			.sort((a, b) => {
				const aTime = a.executedAt?.getTime() ?? 0;
				const bTime = b.executedAt?.getTime() ?? 0;
				if (aTime === bTime) return a.name.localeCompare(b.name);
				return aTime - bTime;
			});

		if (executedMigrations.length === 0) {
			cliLogger.info("No migrations to rollback");
			await cleanup();
			await stopLoggerBuffering();
			process.exit(0);
		}

		const protectedMigrations = config.db.protectedMigrations;
		const migrationsToRollback: string[] = [];

		for (
			let i = executedMigrations.length - 1;
			i >= 0 && migrationsToRollback.length < steps;
			i--
		) {
			const migration = executedMigrations[i];
			if (!migration) continue;

			if (protectedMigrations.includes(migration.name)) {
				cliLogger.error(
					`Cannot rollback protected migration: "${migration.name}"`,
				);
				cliLogger.info(
					"Protected migrations are essential for the CMS to function and cannot be rolled back.",
				);
				cliLogger.info(
					"If you need to reset the database, use",
					cliLogger.color.cyan("migrate:reset"),
					"or",
					cliLogger.color.cyan("migrate:fresh"),
				);
				await cleanup();
				await stopLoggerBuffering();
				process.exit(1);
			}

			migrationsToRollback.push(migration.name);
		}

		cliLogger.info(`Found ${executedMigrations.length} executed migration(s)`);
		cliLogger.warn(
			`Preparing to rollback ${migrationsToRollback.length} migration(s)`,
		);

		if (!force) {
			let shouldProceed: boolean;
			try {
				shouldProceed = await confirm({
					message: `Are you sure you want to rollback ${migrationsToRollback.length} migration(s)? This action cannot be undone.`,
					default: false,
				});
			} catch (error) {
				if (error instanceof Error && error.name === "ExitPromptError") {
					await cleanup();
					await stopLoggerBuffering();
					process.exit(0);
				}
				throw error;
			}

			if (!shouldProceed) {
				cliLogger.info("Rollback cancelled");
				await cleanup();
				await stopLoggerBuffering();
				process.exit(0);
			}
		}

		cliLogger.info(
			`Rolling back ${migrationsToRollback.length} migration(s)...`,
		);

		let rolledBackCount = 0;
		for (let i = 0; i < migrationsToRollback.length; i++) {
			const { error, results } = await migrator.migrateDown();

			if (results) {
				for (const result of results) {
					if (result.status === "Success") {
						logger.debug({
							message: `Rolled back "${result.migrationName}" successfully`,
							scope: constants.logScopes.migrations,
						});
						rolledBackCount++;
					} else if (result.status === "Error") {
						logger.error({
							message: `Failed to rollback migration "${result.migrationName}"`,
							scope: constants.logScopes.migrations,
						});
					}
				}
			}

			if (error) {
				if (error instanceof Error) {
					cliLogger.errorInstance(error, "Rollback failed");
				} else {
					cliLogger.error("Rollback failed", "Unknown error");
				}
				await cleanup();
				await stopLoggerBuffering();
				process.exit(1);
			}
		}

		if (rolledBackCount === 0) {
			cliLogger.warn("No migrations were rolled back");
		} else {
			cliLogger.success(
				`Rolled back ${rolledBackCount} migration(s)`,
				cliLogger.color.green("successfully"),
			);
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
		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			"Rollback completed",
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
	} catch (error) {
		await cleanup();
		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Rollback failed");
		} else {
			cliLogger.error("Rollback failed", "Unknown error");
		}
		await stopLoggerBuffering();
		process.exit(1);
	}
};

export default migrateRollbackCommand;
