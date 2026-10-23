import type { ServiceContext } from "../../../exports/types.js";
import { syncServices } from "../../../services/index.js";
import cliLogger from "../../cli/logger.js";
import applyCollectionMigrations from "../../collection/apply-collection-migrations.js";
import assessMigrationPlans from "../../collection/migration/assess-migration-plan.js";
import planCollectionMigrations from "../../collection/plan-collection-migrations.js";
import type { DatabaseConnection } from "../../db/types.js";
import {
	type MigrationApprovalAction,
	requiresPostMigrationApproval,
	resolveMigrationApproval,
} from "./migration-approval.js";
import {
	isSameMigrationReport,
	reportMigrationAssessment,
} from "./migration-report.js";
import runSyncTasks from "./run-sync-tasks.js";

/** An approval gate that stops migrations until it is accepted. */
export type MigrationApprovalGate = Exclude<MigrationApprovalAction, "proceed">;

export type RunMigrationsResult =
	/** `migrated` is false when nothing needed to run. */
	| { status: "complete"; migrated: boolean }
	/** An approval gate was not accepted, so migrations stopped before it. */
	| { status: "declined"; gate: MigrationApprovalGate }
	/** A plan or migration failed and was reported. */
	| { status: "failed" };

/** Runs database and collection migrations on the caller's connection without prompting, returning approval gates for commands to resubmit with `yes` or `allowDestructive`. */
const runMigrations = async (props: {
	/** A service context over `database`. */
	context: ServiceContext;
	database: DatabaseConnection;
	skipSyncSteps?: boolean;
	/** Keeps checks and sync quiet; migration plans, the work that runs, approvals and failures remain visible. */
	quiet?: boolean;
	/** The plan was shown when an earlier run asked for approval, so this run, with the approval, doesn't show it again. */
	planShown?: boolean;
	yes?: boolean;
	allowDestructive?: boolean;
}): Promise<RunMigrationsResult> => {
	const { context, database } = props;
	const { config } = context;
	const quiet = props.quiet ?? false;
	const planShown = props.planShown ?? false;
	const yes = props.yes ?? false;
	const allowDestructive = props.allowDestructive ?? false;

	cliLogger.info("Checking the migration status", {
		silent: quiet || planShown,
	});
	const initialPlanResult = await planCollectionMigrations(context);
	if (initialPlanResult.error) {
		cliLogger.error(
			"Could not plan collection migrations:",
			context.translate.english(initialPlanResult.error.message) ||
				"Unknown error",
		);
		return { status: "failed" };
	}

	const initialAssessment = assessMigrationPlans(
		initialPlanResult.data.collections.map(
			({ migrationPlan }) => migrationPlan,
		),
	);
	const needsCollectionMigrations = initialAssessment.reasons.length > 0;

	const migrationStatus = await config.db.getMigrationStatus(database.client);
	if (migrationStatus.missing.length > 0) {
		cliLogger.error(
			`${migrationStatus.missing.length} previously executed Lucid migration(s) are no longer registered`,
		);
		for (const name of migrationStatus.missing) {
			cliLogger.log(cliLogger.color.red(name), { indent: 2 });
		}
		cliLogger.info(
			"Check the installed @lucidcms/core version matches the database.",
		);
		return { status: "failed" };
	}

	if (migrationStatus.retired.length > 0) {
		cliLogger.warn(
			`${migrationStatus.retired.length} previously executed migration(s) are no longer registered and will be skipped`,
			{ silent: quiet || planShown },
		);
		for (const name of migrationStatus.retired) {
			cliLogger.log(cliLogger.color.yellow(name), {
				indent: 2,
				silent: quiet || planShown,
			});
		}
		cliLogger.info(
			"These came from a removed plugin or migration file. Any tables they created are left in place.",
			{ silent: quiet || planShown },
		);
	}

	const needsCoreMigrations = migrationStatus.pendingCore.length > 0;
	const needsExternalMigrations = migrationStatus.pendingExternal.length > 0;
	const needsDatabaseMigrations =
		needsCoreMigrations || needsExternalMigrations;

	if (needsDatabaseMigrations && !planShown) {
		cliLogger.warn(
			"Database schema migrations are pending and require approval because their migration bodies cannot be classified.",
		);
	}

	if (needsCollectionMigrations && !planShown) {
		reportMigrationAssessment(initialAssessment);
	}

	//* no-op path: nothing to migrate, but sync still runs
	if (!needsDatabaseMigrations && !needsCollectionMigrations) {
		cliLogger.success("No migrations are required", { silent: quiet });

		if (!props.skipSyncSteps) {
			const syncResult = await runSyncTasks(context, { quiet });
			if (!syncResult) return { status: "failed" };
		}

		return { status: "complete", migrated: false };
	}

	//* approval: safe collection-only plans bypass this gate
	const initialApproval = resolveMigrationApproval({
		assessment: initialAssessment,
		hasPendingDatabaseMigrations: needsDatabaseMigrations,
		yes,
		allowDestructive,
	});
	if (initialApproval !== "proceed") {
		return { status: "declined", gate: initialApproval };
	}

	//* core schema must exist before collection migrations are planned and applied
	if (needsCoreMigrations) {
		cliLogger.info("Running Lucid schema migrations...");
		await config.db.migrateCoreToLatest(database);
		cliLogger.success(
			"Lucid schema migrations completed",
			cliLogger.color.green("successfully"),
		);
	}

	const exactPlanResult = needsCoreMigrations
		? await planCollectionMigrations(context)
		: initialPlanResult;
	if (exactPlanResult.error) {
		cliLogger.error(
			"Could not re-plan collection migrations after database migrations:",
			context.translate.english(exactPlanResult.error.message) ||
				"Unknown error",
		);
		return { status: "failed" };
	}

	const exactAssessment = assessMigrationPlans(
		exactPlanResult.data.collections.map(({ migrationPlan }) => migrationPlan),
	);

	// The plan made before the database migrations was shown already, so only one that changed is shown again.
	if (
		needsCoreMigrations &&
		exactAssessment.reasons.length > 0 &&
		!isSameMigrationReport(initialAssessment, exactAssessment)
	) {
		cliLogger.info("Post-migration collection plan:");
		reportMigrationAssessment(exactAssessment);
	}

	if (
		needsCoreMigrations &&
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
		if (increasedRiskApproval !== "proceed") {
			return { status: "declined", gate: increasedRiskApproval };
		}
	}

	if (exactAssessment.reasons.length > 0) {
		const preCollectionSyncResult = await syncServices.syncCollections(context);
		if (preCollectionSyncResult.error) {
			cliLogger.error(
				"Sync failed during pre-migration collection sync:",
				context.translate.english(preCollectionSyncResult.error.message) ||
					"Unknown error",
			);
			return { status: "failed" };
		}

		cliLogger.info("Running collection migrations...");
		const migrationResult = await applyCollectionMigrations(
			context,
			exactPlanResult.data,
		);
		if (migrationResult.error) {
			cliLogger.error(
				"Collection migrations failed:",
				context.translate.english(migrationResult.error.message) ||
					"Unknown error",
			);

			// Service errors keep a generic message, so the database's own error is what explains the failure.
			if (migrationResult.error.cause instanceof Error) {
				cliLogger.errorInstance(migrationResult.error.cause, "Caused by");
			}

			return { status: "failed" };
		}

		cliLogger.success(
			"Collection migrations completed",
			cliLogger.color.green("successfully"),
		);
	}

	//* external migrations can rely on synchronized collection state and data
	if (!props.skipSyncSteps || needsExternalMigrations) {
		const syncResult = await runSyncTasks(context, { quiet });
		if (!syncResult) return { status: "failed" };
	}

	if (needsExternalMigrations) {
		cliLogger.info("Running external schema migrations...");
		await config.db.migrateExternalToLatest(database, context);
		cliLogger.success(
			"External schema migrations completed",
			cliLogger.color.green("successfully"),
		);
	}

	cliLogger.info("Clearing KV cache...", { silent: quiet });
	await context.kv.clear(context);

	return { status: "complete", migrated: true };
};

export default runMigrations;
