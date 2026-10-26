import type { Command } from "commander";
import type z from "zod";
import { LucidError } from "../../../utils/errors/index.js";
import type { LoadConfigResult } from "../../config/load-config-file.js";
import loadPluginClis from "../../plugins/load-plugin-clis.js";
import type {
	LucidPluginCommand,
	LucidPluginCommandLogger,
	LucidPluginTask,
	LucidPluginTaskResult,
} from "../../plugins/types.js";
import assertNoHost from "../../vite/assert-no-host.js";
import loadProject from "../../vite/load-project.js";
import cliLogger from "../logger.js";
import createViteConfig from "../services/create-vite-config.js";
import runTaskCommand from "../services/run-task-command.js";

const logger: LucidPluginCommandLogger = {
	info: (message) => cliLogger.info(message),
	warn: (message, details = []) => {
		cliLogger.warn(message);
		for (const detail of details) {
			cliLogger.log(detail, { indent: 2, symbol: "child" });
		}
	},
	error: (error, heading) => {
		if (error instanceof Error) cliLogger.errorInstance(error, heading);
		else cliLogger.error(heading, String(error));
	},
};

/** Runs a plugin's command, which reaches the runtime through the plugin's tasks. */
const pluginCommand =
	(command: LucidPluginCommand, key: string, loaded: LoadConfigResult) => () =>
		runTaskCommand(`"${command.name}" failed`, async (run, elapsed) => {
			await command.run({
				config: loaded.config,
				projectRoot: loaded.projectRoot,
				publicFiles: loaded.resources.files.public,
				// Load build config only when requested, rejecting projects whose framework owns the build.
				viteConfig: async () => {
					await assertNoHost(loaded.projectRoot);
					// Commands report their own progress, so Vite only reports warnings and errors.
					return createViteConfig({
						configPath: loaded.configPath,
						mode: "production",
						logLevel: "warn",
						prepare: false,
						// Commands build their own entries, such as a static site's, which the admin isn't part of.
						admin: false,
					});
				},
				// The runtime runs this version of the plugin's tasks, so their JSON is the result the command asked for.
				runTask: async <Task extends LucidPluginTask>(
					name: string,
					input: z.input<Task["input"]>,
				) =>
					(await run("plugin", {
						key,
						name,
						input,
					})) as LucidPluginTaskResult<Task>,
				logger,
			});

			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				`"${command.name}" completed`,
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(elapsed())),
				{ spaceAfter: true, spaceBefore: true },
			);
			return 0;
		});

/** Registers plugin commands after loading the project as `lucid()` does, only for unknown commands so they stay out of `lucidcms --help`. */
export const registerPluginCommands = async (program: Command) => {
	const requested = process.argv[2];
	if (!requested || requested.startsWith("-") || requested === "help") return;

	const known = new Set(
		program.commands.flatMap((item) => [item.name(), ...item.aliases()]),
	);
	if (known.has(requested)) return;

	const { project: loaded } = await loadProject();

	for (const { key, cli } of await loadPluginClis(
		loaded.config,
		loaded.projectRoot,
	)) {
		for (const command of cli.commands ?? []) {
			if (known.has(command.name)) {
				throw new LucidError({
					message: `The "${key}" plugin's "${command.name}" command has the same name as a built-in or another plugin's command.`,
				});
			}

			known.add(command.name);
			program
				.command(command.name)
				.description(command.description)
				.action(pluginCommand(command, key, loaded));
		}
	}
};
