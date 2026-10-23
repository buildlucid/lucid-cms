import type { RuntimeTaskInput } from "../../runtime/tasks/index.js";
import runMigrateTask from "../../vite/run-migrate-task.js";
import cliLogger from "../logger.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/** Runs database and collection migrations in the runtime, asking in the terminal about any that need review. */
const migrateCommand = (
	options?: RuntimeTaskInput<"migrate"> & TaskServerOptions,
) =>
	runTaskCommand(
		"Migration failed",
		async (run, elapsed) => {
			const result = await runMigrateTask(run, options);
			if (result.status === "declined") {
				return result.gate === "reject-destructive" ? 1 : 0;
			}

			if (result.status === "failed") return 1;

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				"Migrations completed",
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{
					spaceAfter: true,
					spaceBefore: true,
					silent: options?.quiet && !result.migrated,
				},
			);
			return 0;
		},
		options,
	);

export default migrateCommand;
