import confirm from "@inquirer/confirm";
import { LucidError } from "../../../utils/errors/index.js";
import cliLogger from "../logger.js";
import runPrompt from "../services/run-prompt.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/** Rolls back the most recently executed migrations in the runtime, after confirming the plan unless forced. */
const migrateRollbackCommand = (
	options?: { force?: boolean; steps?: string } & TaskServerOptions,
) =>
	runTaskCommand(
		"Rollback failed",
		async (run, elapsed) => {
			const steps = Number(options?.steps ?? 1);
			if (!Number.isInteger(steps) || steps < 1) {
				throw new LucidError({
					message: "--steps must be a whole number of at least 1.",
				});
			}

			cliLogger.info("Checking rollback status");
			let migrations: string[] | undefined;

			while (true) {
				const result = await run("migrate:rollback", { steps, migrations });
				switch (result.status) {
					case "missing": {
						cliLogger.error(
							`Cannot rollback: previously executed Lucid migration(s) are no longer registered: ${result.migrations.join(", ")}`,
						);
						cliLogger.info(
							"Check the installed @lucidcms/core version matches the database.",
						);
						return 1;
					}
					case "none": {
						cliLogger.info("No migrations to rollback");
						return 0;
					}
					case "protected": {
						cliLogger.error(
							`Cannot rollback protected migration: "${result.migration}"`,
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
						return 1;
					}
					case "retired": {
						cliLogger.error(
							`Cannot rollback migration "${result.migration}" as it is no longer registered`,
						);
						cliLogger.info(
							"Restore the plugin or migration file that registered it to roll it back.",
						);
						return 1;
					}
					case "confirm": {
						cliLogger.info(`Found ${result.executed} executed migration(s)`);
						cliLogger.warn(
							`Preparing to rollback ${result.migrations.length} migration(s)`,
						);

						const proceed =
							options?.force ||
							(await runPrompt((output) =>
								confirm(
									{
										message: `Are you sure you want to rollback ${result.migrations.length} migration(s)? This action cannot be undone.`,
										default: false,
									},
									{ output },
								),
							));
						if (!proceed) {
							cliLogger.info("Rollback cancelled");
							return 0;
						}

						migrations = result.migrations;
						break;
					}
					case "complete": {
						cliLogger.log(
							cliLogger.createBadge("LUCID CMS"),
							"Rollback completed",
							cliLogger.color.green("successfully"),
							"in",
							cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
							{ spaceAfter: true, spaceBefore: true },
						);
						return 0;
					}
				}
			}
		},
		options,
	);

export default migrateRollbackCommand;
