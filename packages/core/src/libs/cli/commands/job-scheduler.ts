import select from "@inquirer/select";
import { LucidError } from "../../../utils/errors/index.js";
import cliLogger from "../logger.js";
import runPrompt from "../services/run-prompt.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/** Runs one registered job schedule in the runtime, found by its key or job name, or picked from a list. */
const jobSchedulerCommand = (
	jobOrSchedule?: string,
	options?: TaskServerOptions,
) =>
	runTaskCommand(
		"Failed to run job schedule",
		async (run, elapsed) => {
			const schedules = await run("jobs:list", {});
			if (schedules.length === 0) {
				throw new LucidError({ message: "No job schedules are registered." });
			}

			const reference =
				jobOrSchedule ??
				(await runPrompt((output) =>
					select(
						{
							message: "Select a job schedule to run:",
							choices: schedules.map((schedule) => ({
								name: `${schedule.key} (${schedule.cron} · ${schedule.timezone})`,
								value: schedule.key,
							})),
						},
						{ output },
					),
				));

			const result = await run("jobs:schedule", { reference });
			if (result.status === "unknown") {
				throw new LucidError({
					message: `Unknown job or schedule "${reference}". Available schedules: ${schedules.map((schedule) => schedule.key).join(", ")}.`,
				});
			}

			if (result.status === "failed") {
				cliLogger.error(
					`Failed to run job schedule "${result.key}"`,
					result.message,
				);
				return 1;
			}

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				`Job schedule "${result.key}" triggered`,
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		},
		options,
	);

export default jobSchedulerCommand;
