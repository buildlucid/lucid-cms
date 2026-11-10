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
import {
	remoteOptionDescription,
	type TaskServerOptions,
} from "../services/start-task-server.js";

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
	(command: LucidPluginCommand, key: string, loaded: LoadConfigResult) =>
	(
		options: TaskServerOptions &
			Parameters<LucidPluginCommand["run"]>[0]["options"],
	) =>
		runTaskCommand(
			`"${command.name}" failed`,
			async (run, elapsed) => {
				const { remote: _remote, ...commandOptions } = options;
				await command.run({
					options: commandOptions,
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
					// Run matching plugin task versions to keep command results compatible.
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
			},
			options,
		);

/**
 * Loads project plugin commands, including for `--help`. Built-in commands skip project loading.
 */
export const registerPluginCommands = async (program: Command) => {
	const requested = process.argv[2];
	const help = !requested || requested.startsWith("-") || requested === "help";

	const known = new Set(
		program.commands.flatMap((item) => [item.name(), ...item.aliases()]),
	);
	if (requested && known.has(requested)) return;

	//* help still works outside a project, or in one whose config doesn't load
	const project = help
		? await loadProject().catch(() => undefined)
		: await loadProject();
	if (!project) return;
	const { project: loaded } = project;

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
			const registered = program
				.command(command.name)
				.description(command.description);
			for (const option of command.options ?? []) {
				registered.option(option.flags, option.description);
			}
			registered
				.option("--remote", remoteOptionDescription)
				.action(pluginCommand(command, key, loaded));
		}
	}
};
