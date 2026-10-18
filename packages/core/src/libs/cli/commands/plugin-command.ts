import type { Command } from "commander";
import { LucidError } from "../../../utils/errors/index.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import type { LoadConfigResult } from "../../config/load-config-file.js";
import type { DatabaseConnection } from "../../db/types.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import type {
	LucidPluginCommand,
	LucidPluginCommandLogger,
} from "../../plugins/types.js";
import createToolkit from "../../toolkit/create-toolkit.js";
import cliLogger from "../logger.js";
import readPluginData from "../services/read-plugin-data.js";

const logger: LucidPluginCommandLogger = {
	info: (message) => cliLogger.info(message),
	warn: (message) => cliLogger.warn(message),
	error: (error, heading) => {
		if (error instanceof Error) cliLogger.errorInstance(error, heading);
		else cliLogger.error(heading, String(error));
	},
};

/** Runs a plugin's command with a database connection, KV and toolkit. */
const pluginCommand =
	(command: LucidPluginCommand, loaded: LoadConfigResult) => async () => {
		const { config, env } = loaded;
		let database: DatabaseConnection | undefined;
		let kv: KVAdapterInstance | undefined;

		const cleanupAdapters = async () => {
			await Promise.allSettled([
				database?.destroy(),
				destroyKVAdapter(kv, {
					config,
					env,
					runtimeContext: loaded.runtimeContext,
				}),
			]);
		};

		try {
			startLoggerBuffering();
			const startTime = cliLogger.startTimer();
			const runtimeContext = {
				...loaded.runtimeContext,
				pluginData: await readPluginData(config),
			};
			const { translationStore } = await prepareTranslations({
				config,
				files: loaded.resources.files.translations,
			});
			database = await config.db.connect(env);
			kv = await getInitializedKVAdapter(config, { env, runtimeContext });
			const context = createServiceContext({
				config,
				database,
				translationStore,
				env,
				runtimeContext,
				kv,
			});

			await command.run({
				config,
				context,
				toolkit: createToolkit(context),
				publicFiles: loaded.resources.files.public,
				logger,
			});

			const endTime = startTime();
			await cleanupAdapters();
			cliLogger.log(
				cliLogger.createBadge("LUCID CMS"),
				`"${command.name}" completed`,
				cliLogger.color.green("successfully"),
				"in",
				cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
				{ spaceAfter: true, spaceBefore: true },
			);
			await stopLoggerBuffering();
			process.exit(0);
		} catch (error) {
			await cleanupAdapters();
			logger.error(error, `"${command.name}" failed`);
			await stopLoggerBuffering();
			process.exit(1);
		}
	};

/** Loads config to register plugin commands only for unknown CLI commands, leaving them out of `lucidcms --help`. */
export const registerPluginCommands = async (
	program: Command,
	loadConfig: () => Promise<LoadConfigResult>,
) => {
	const requested = process.argv[2];
	if (!requested || requested.startsWith("-") || requested === "help") return;

	const known = new Set(
		program.commands.flatMap((item) => [item.name(), ...item.aliases()]),
	);
	if (known.has(requested)) return;

	const loaded = await loadConfig();
	for (const plugin of loaded.config.plugins) {
		for (const command of plugin.commands ?? []) {
			if (known.has(command.name)) {
				throw new LucidError({
					message: `The "${plugin.key}" plugin's "${command.name}" command has the same name as a built-in or another plugin's command.`,
				});
			}
			known.add(command.name);
			program
				.command(command.name)
				.description(command.description)
				.action(pluginCommand(command, loaded));
		}
	}
};
