import type { MigrationRisk } from "../../collection/migration/types.js";
import { describeMigrationRiskReason } from "../../runtime/tasks/migration-report.js";
import cliLogger from "../logger.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/**
 * A read-only preflight that reports what `migrate` would do and whether the
 * migration history is healthy. With `--check` it exits non-zero when
 * migrations are pending or executed Lucid migrations are missing from the
 * registered set, so it can gate CI and deploy pipelines. Retired plugin
 * migrations only warn.
 */
const migrateStatusCommand = (
	options?: { check?: boolean } & TaskServerOptions,
) =>
	runTaskCommand(
		"Migration status failed",
		async (run, elapsed) => {
			cliLogger.info("Checking the migration status");
			const status = await run("migrate:status", {});

			cliLogger.info(`Found ${status.executed} applied migration(s)`);

			if (status.pending.length === 0) {
				cliLogger.success("No database schema migrations are pending");
			} else {
				cliLogger.warn(
					`${status.pending.length} database schema migration(s) are pending`,
				);
				for (const name of status.pending) {
					cliLogger.log(cliLogger.color.yellow(name), { indent: 2 });
				}
			}

			const { collections } = status;
			if ("error" in collections) {
				cliLogger.warn(
					`Could not check collection migration status: ${collections.error}`,
				);
			} else if (collections.pending.length === 0) {
				cliLogger.success("No collection/brick table migrations are needed");
			} else {
				cliLogger.warn(
					`${collections.pending.length} collection(s) need table migrations`,
				);
				for (const risk of [
					"safe",
					"warning",
					"destructive",
				] satisfies MigrationRisk[]) {
					const grouped = collections.pending.filter(
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

			if (status.missing.length > 0) {
				cliLogger.error(
					`${status.missing.length} previously executed Lucid migration(s) are no longer registered`,
				);
				for (const name of status.missing) {
					cliLogger.log(cliLogger.color.red(name), { indent: 2 });
				}
				cliLogger.info(
					"Check the installed @lucidcms/core version matches the database.",
				);
			}

			if (status.retired.length > 0) {
				cliLogger.warn(
					`${status.retired.length} previously executed migration(s) are no longer registered and are skipped`,
				);
				for (const name of status.retired) {
					cliLogger.log(cliLogger.color.yellow(name), { indent: 2 });
				}
				cliLogger.info(
					"These came from a removed plugin or migration file. Any tables they created are left in place.",
				);
			}

			const outstanding =
				status.pending.length > 0 ||
				"error" in collections ||
				collections.pending.length > 0 ||
				status.missing.length > 0;

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				outstanding
					? "Migration status checked with"
					: "Migration status checked",
				outstanding
					? cliLogger.color.yellow("outstanding work")
					: cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return options?.check && outstanding ? 1 : 0;
		},
		options,
	);

export default migrateStatusCommand;
