import select from "@inquirer/select";
import { LucidError } from "../../../utils/errors/index.js";
import cliLogger from "../logger.js";
import runPrompt from "../services/run-prompt.js";
import runTaskCommand from "../services/run-task-command.js";
import type { TaskServerOptions } from "../services/start-task-server.js";

/** Lists every project and plugin seed without opening a database connection. */
export const seedListCommand = (options?: TaskServerOptions) =>
	runTaskCommand(
		"Failed to list seeds",
		async (run) => {
			const names = await run("seed:list", {});
			if (names.length === 0) {
				cliLogger.info("No seeds are registered");
				return 0;
			}

			cliLogger.info(`Found ${names.length} registered seed(s)`);
			for (const name of names) {
				cliLogger.log(cliLogger.color.cyan(name), {
					indent: 2,
					symbol: "child",
				});
			}
			return 0;
		},
		options,
	);

/** Runs the named seed, every seed with `--all`, or one picked from a list, in the runtime. */
const seedCommand = (
	seedName?: string,
	options?: { all?: boolean } & TaskServerOptions,
) =>
	runTaskCommand(
		"Seed failed",
		async (run, elapsed) => {
			if (seedName && options?.all) {
				throw new LucidError({
					message: "Specify either a seed name or --all, not both.",
				});
			}

			let names = seedName ? [seedName] : [];
			if (!seedName) {
				const available = await run("seed:list", {});
				if (available.length === 0) {
					cliLogger.info("No seeds are registered");
					return 0;
				}

				names = options?.all
					? available
					: [
							await runPrompt((output) =>
								select(
									{
										message: "Select a seed to run:",
										choices: available.map((name) => ({ name, value: name })),
									},
									{ output },
								),
							),
						];
			}

			const { seeded } = await run("seed", { names });

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				`${seeded} seed(s) completed`,
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		},
		options,
	);

export default seedCommand;
