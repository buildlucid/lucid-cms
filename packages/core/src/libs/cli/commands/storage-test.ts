import cliLogger from "../logger.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

const stepLabels = {
	write: "Write a file",
	read: "Read it back",
	delete: "Delete it",
} as const;

/** Tests the media storage adapter can write, read and delete a file, listing each step's outcome. */
const storageTestCommand = (options?: TaskServerOptions) =>
	runTaskCommand(
		"Storage test failed",
		async (run, elapsed) => {
			const result = await run("storage:test", {});
			const passed = (name: keyof typeof stepLabels) =>
				result.steps.some((step) => step.name === name && step.error === null);

			cliLogger.info(`Testing the "${result.adapter}" media storage adapter`, {
				spaceBefore: true,
			});
			for (const step of result.steps) {
				if (step.error === null) {
					cliLogger.success(stepLabels[step.name], { indent: 2 });
					continue;
				}
				cliLogger.error(stepLabels[step.name], { indent: 2 });
				cliLogger.log(step.error, { indent: 4, symbol: "child" });
			}

			if (passed("write") && !passed("delete")) {
				cliLogger.warn(`The test file is still stored at "${result.key}".`, {
					spaceBefore: true,
				});
			}
			if (result.steps.some((step) => step.error !== null)) {
				cliLogger.error("Media storage isn't working", {
					spaceBefore: true,
					spaceAfter: true,
				});
				return 1;
			}

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				"Media storage tested",
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		},
		options,
	);

export default storageTestCommand;
