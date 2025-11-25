import { confirm } from "@inquirer/prompts";
import { Migrator } from "kysely";
import constants from "../../../constants/constants.js";
import type { Config } from "../../../types.js";
import loadConfigFile from "../../config/load-config-file.js";
import getKVAdapter from "../../kv-adapter/get-adapter.js";
import logger from "../../logger/index.js";
import cliLogger from "../logger.js";
import validateEnvVars from "../services/validate-env-vars.js";

const migrateRollbackCommand = async (options?: {
	force?: boolean;
	steps?: number;
}) => {
	try {
		logger.setBuffering(true);
		const startTime = cliLogger.startTimer();
		const steps = options?.steps ?? 1;
		const force = options?.force ?? false;

		const res = await loadConfigFile();
		const config: Config = res.config;

		const envValid = await validateEnvVars({
			envSchema: res.envSchema,
			env: res.env,
		});

		if (!envValid) {
			logger.setBuffering(false);
			process.exit(1);
		}

		cliLogger.info("Checking rollback status");

		const migrator = new Migrator({
			db: config.db.client,
			provider: {
				async getMigrations() {
					return config.db.migrations;
				},
			},
		});

		await config.db.initialize();

		const migrations = await migrator.getMigrations();
		const executedMigrations = migrations.filter(
			(m) => m.executedAt !== undefined,
		);

		if (executedMigrations.length === 0) {
			cliLogger.info("No migrations to rollback");
			logger.setBuffering(false);
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
				logger.setBuffering(false);
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
					logger.setBuffering(false);
					process.exit(0);
				}
				throw error;
			}

			if (!shouldProceed) {
				cliLogger.info("Rollback cancelled");
				logger.setBuffering(false);
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
				cliLogger.error(
					"Rollback failed",
					error instanceof Error ? error.message : "Unknown error",
				);
				if (error instanceof Error) cliLogger.errorInstance(error);
				logger.setBuffering(false);
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
		const kvInstance = await getKVAdapter(config);
		await kvInstance.command.clear();

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

		logger.setBuffering(false);
		process.exit(0);
	} catch (error) {
		cliLogger.error(
			"Rollback failed",
			error instanceof Error ? error.message : "Unknown error",
		);
		if (error instanceof Error) cliLogger.errorInstance(error);
		logger.setBuffering(false);
		process.exit(1);
	}
};

export default migrateRollbackCommand;
