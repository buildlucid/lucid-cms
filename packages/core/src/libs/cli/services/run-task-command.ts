import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import type { RuntimeTaskName } from "../../runtime/tasks/index.js";
import type { RuntimeTaskClient } from "../../vite/create-task-client.js";
import cliLogger from "../logger.js";
import cliSpinner from "../spinner.js";
import startTaskServer, {
	type TaskServer,
	type TaskServerOptions,
} from "./start-task-server.js";

const taskSteps: Record<RuntimeTaskName, string> = {
	migrate: "Running migrations",
	"migrate:status": "Checking migrations",
	"migrate:rollback": "Rolling back migrations",
	"migrate:reset": "Resetting the database",
	sync: "Syncing",
	"seed:list": "Listing seeds",
	seed: "Running seeds",
	"jobs:list": "Listing jobs",
	"jobs:schedule": "Running the job",
	"users:reset-two-factor": "Resetting two-factor authentication",
	"users:super-admin": "Making the user a super admin",
	plugin: "Running the plugin's task",
};

/** Runs a runtime task with spinner updates. Cancelled prompts exit successfully. */
const runTaskCommand = async (
	failure: string,
	command: (
		run: RuntimeTaskClient,
		/** Milliseconds since the command started. */
		elapsed: () => number,
	) => Promise<number>,
	options?: TaskServerOptions,
) => {
	startLoggerBuffering();
	const elapsed = cliLogger.startTimer();
	let server: Promise<TaskServer> | undefined;
	let exitCode = 1;

	try {
		exitCode = await command((name, input) => {
			server ??= startTaskServer(options);
			return server.then((started) => {
				cliSpinner.start(taskSteps[name]);
				return started.run(name, input);
			});
		}, elapsed);
	} catch (error) {
		cliSpinner.stop();

		if (error instanceof Error && error.name === "ExitPromptError") {
			exitCode = 0;
		} else if (error instanceof Error) {
			cliLogger.errorInstance(error, failure);
		} else {
			cliLogger.error(failure, "Unknown error");
		}
	}

	cliSpinner.stop();
	await (await server?.catch(() => undefined))?.close();
	await stopLoggerBuffering();
	process.exit(exitCode);
};

export default runTaskCommand;
