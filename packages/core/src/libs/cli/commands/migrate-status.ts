import { sql } from "kysely";
import constants from "../../../constants/constants.js";
import type { Config, EnvironmentVariables } from "../../../types.js";
import assessMigrationPlans from "../../collection/migration/assess-migration-plan.js";
import type {
	MigrationAssessment,
	MigrationRisk,
} from "../../collection/migration/types.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import loadConfigFile from "../../config/load-config-file.js";
import { prepareExternalMigrations } from "../../db/load-external-migrations.js";
import { passthroughEmailAdapterInstance } from "../../email/adapters/passthrough.js";
import { createTranslator } from "../../i18n/index.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import passthroughKVAdapter from "../../kv/adapters/passthrough.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import passthroughQueueAdapter from "../../queue/adapters/passthrough.js";
import type { AdapterRuntimeContext } from "../../runtime/types.js";
import cliLogger from "../logger.js";
import { describeMigrationRiskReason } from "../services/migration-report.js";
import validateEnvVars from "../services/validate-env-vars.js";

/**
 * A read-only preflight that reports what `migrate` would do and whether the
 * migration history is healthy. With `--check` it exits non-zero when
 * migrations are pending or executed migrations are missing from the
 * registered set, so it can gate CI and deploy pipelines.
 */
const migrateStatusCommand = async (options?: {
	check?: boolean;
	remote?: boolean;
}) => {
	let config: Config | undefined;
	let env: EnvironmentVariables | undefined;
	let runtimeContext: AdapterRuntimeContext | undefined;

	try {
		startLoggerBuffering();
		const startTime = cliLogger.startTimer();

		const res = await loadConfigFile({
			prepareRuntime: true,
		});
		config = res.config;
		env = res.env;
		runtimeContext = res.runtimeContext;
		const { translationStore } = await prepareTranslations({
			config,
			projectRoot: res.projectRoot,
		});

		const envValid = await validateEnvVars({
			envSchema: res.envSchema,
			env: res.env,
		});
		if (!envValid) {
			await stopLoggerBuffering();
			process.exit(1);
		}

		cliLogger.info("Checking the migration status");

		await prepareExternalMigrations(config, res.projectRoot);
		await config.db.initialize();

		//* database migration status
		const registeredMigrations = Object.keys(config.db.migrations).sort();
		let executedMigrations: string[] = [];
		try {
			const executedRows = await sql<{ name: string }>`
				SELECT name FROM kysely_migration
			`.execute(config.db.client);
			executedMigrations = executedRows.rows.map((row) => row.name);
		} catch (_) {
			//* the migration table doesnt exist yet - no migrations have run
		}

		const pendingMigrations = registeredMigrations.filter(
			(name) => !executedMigrations.includes(name),
		);
		const missingMigrations = executedMigrations.filter(
			(name) => !registeredMigrations.includes(name),
		);

		//* collection migration status
		const translate = createTranslator({
			store: translationStore,
			locale: "en",
		});
		const collectionResult = await planCollectionMigrations({
			db: { client: config.db.client },
			config: config,
			queue: passthroughQueueAdapter(),
			env: env ?? null,
			runtimeContext,
			kv: passthroughKVAdapter(),
			media: null,
			email: passthroughEmailAdapterInstance,
			translate,
			request: {
				url: config.host ?? constants.urls.localhost,
				locale: "en",
			},
		});

		let pendingCollections: Array<{
			collectionKey: string;
			assessment: MigrationAssessment;
		}> = [];
		let collectionCheckError: string | undefined;
		if (collectionResult.error) {
			collectionCheckError =
				translate.english(collectionResult.error.message) || "Unknown error";
		} else {
			pendingCollections = collectionResult.data.collections
				.map(({ migrationPlan }) => ({
					collectionKey: migrationPlan.collectionKey,
					assessment: assessMigrationPlans([migrationPlan]),
				}))
				.filter(({ assessment }) => assessment.reasons.length > 0);
		}

		//* report
		cliLogger.info(`Found ${executedMigrations.length} applied migration(s)`);

		if (pendingMigrations.length === 0) {
			cliLogger.success("No database schema migrations are pending");
		} else {
			cliLogger.warn(
				`${pendingMigrations.length} database schema migration(s) are pending`,
			);
			for (const name of pendingMigrations) {
				cliLogger.log(cliLogger.color.yellow(name), { indent: 2 });
			}
		}

		if (collectionCheckError) {
			cliLogger.warn(
				`Could not check collection migration status: ${collectionCheckError}`,
			);
		} else if (pendingCollections.length === 0) {
			cliLogger.success("No collection/brick table migrations are needed");
		} else {
			cliLogger.warn(
				`${pendingCollections.length} collection(s) need table migrations`,
			);
			for (const risk of [
				"safe",
				"warning",
				"destructive",
			] satisfies MigrationRisk[]) {
				const grouped = pendingCollections.filter(
					(item) => item.assessment.risk === risk,
				);
				if (grouped.length === 0) continue;
				cliLogger.log(`${risk.toUpperCase()} (${grouped.length})`, {
					indent: 2,
				});
				for (const item of grouped) {
					cliLogger.log(cliLogger.color.yellow(item.collectionKey), {
						indent: 4,
					});
					for (const reason of item.assessment.reasons) {
						cliLogger.log(describeMigrationRiskReason(reason), { indent: 6 });
					}
				}
			}
		}

		if (missingMigrations.length > 0) {
			cliLogger.error(
				`${missingMigrations.length} previously executed migration(s) are no longer registered`,
			);
			for (const name of missingMigrations) {
				cliLogger.log(cliLogger.color.red(name), { indent: 2 });
			}
			cliLogger.info(
				"If you removed a plugin or migration file, restore it so its migrations can be run or rolled back.",
			);
		}

		const hasPendingWork =
			pendingMigrations.length > 0 ||
			pendingCollections.length > 0 ||
			collectionCheckError !== undefined;
		const unhealthy = missingMigrations.length > 0;

		const endTime = startTime();
		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			hasPendingWork || unhealthy
				? "Migration status checked with"
				: "Migration status checked",
			hasPendingWork || unhealthy
				? cliLogger.color.yellow("outstanding work")
				: cliLogger.color.green("successfully"),
			"in",
			cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
			{
				spaceAfter: true,
				spaceBefore: true,
			},
		);

		await stopLoggerBuffering();
		process.exit(options?.check && (hasPendingWork || unhealthy) ? 1 : 0);
	} catch (error) {
		cliLogger.error(
			"Migration status failed",
			error instanceof Error ? error.message : "Unknown error",
		);
		if (error instanceof Error) cliLogger.errorInstance(error);
		await stopLoggerBuffering();
		process.exit(1);
	}
};

export default migrateStatusCommand;
