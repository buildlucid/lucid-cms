import confirm from "@inquirer/confirm";
import runMigrateTask from "../../vite/run-migrate-task.js";
import cliLogger from "../logger.js";
import runPrompt from "../services/run-prompt.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/** Drops every database table and runs all migrations again in the runtime, after confirming unless forced. */
const migrateFreshCommand = (
	options?: { force?: boolean } & TaskServerOptions,
) =>
	runTaskCommand(
		"Fresh migration failed",
		async (run, elapsed) => {
			cliLogger.warn(
				"This will drop all database tables and re-run all migrations",
			);

			const proceed =
				options?.force ||
				(await runPrompt((output) =>
					confirm(
						{
							message:
								"Are you sure you want to fresh migrate the database? This will drop ALL tables and re-run migrations. This action cannot be undone.",
							default: false,
						},
						{ output },
					),
				));
			if (!proceed) {
				cliLogger.info("Fresh migration cancelled");
				return 0;
			}

			cliLogger.info("Dropping all database tables...");
			await run("migrate:reset", {});

			const result = await runMigrateTask(run, {
				skipSyncSteps: false,
				allowDestructive: true,
			});
			if (result.status !== "complete") return 1;

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				"Fresh migration completed",
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		},
		options,
	);

export default migrateFreshCommand;
