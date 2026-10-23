import path from "node:path";
import { createServer, type Plugin, type ViteDevServer } from "vite";
import getConfigPath from "../../config/get-config-path.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import createCommandTelemetryReporter, {
	type CommandTelemetryReporter,
} from "../../telemetry/command-reporter.js";
import findLucidViteApi from "../../vite/find-lucid-vite-api.js";
import cliLogger from "../logger.js";
import createViteConfig from "../services/create-vite-config.js";
import {
	clearDevScreen,
	getServerUrl,
	logRestart,
	logServerReady,
} from "../services/server-logger.js";
import updateAvailable from "../services/update-available.js";
import watchProject from "../services/watch-project.js";
import cliSpinner from "../spinner.js";

const warnMigrationsIncomplete = () => {
	cliLogger.warn(
		"Lucid answers requests with an error until its migrations complete. Fix the problem above, then save a file to retry.",
	);
};

/** Starts Lucid in the runtime's Vite environment, refreshing plugins, config and resources on every restart while keeping the running server if its replacement fails. */
const devCommand = async (options?: {
	watch?: string;
	clearScreen?: boolean;
	remote?: boolean;
}) => {
	const commandStartedAt = Date.now();
	const coreUpdateAvailable = updateAvailable().catch(() => undefined);
	const watchPaths = options?.watch ? [path.resolve(options.watch)] : [];
	let server: ViteDevServer | undefined;
	let telemetryReporter: CommandTelemetryReporter | undefined;
	let changedFile: string | undefined;
	/** Why the next restart happens, such as a changed file, for its spinner and result line. */
	let restartReason: string | undefined;
	let restarting: Promise<void> | undefined;
	let closing = false;

	// A save can emit several events, so restarts wait briefly for them to settle, and edits made during a restart lead
	// to one more restart with the latest files.
	const requestRestart = (file: string) => {
		if (closing) return;

		changedFile = file;

		restarting ??= (async () => {
			await new Promise((resolve) => setTimeout(resolve, 100));

			while (changedFile && server && !closing) {
				const next = changedFile;
				changedFile = undefined;

				if (options?.clearScreen !== false) clearDevScreen();
				restartReason = `${path.relative(process.cwd(), next)} changed`;
				await server.restart();
			}
		})()
			.catch((error: unknown) => {
				if (error instanceof Error) {
					cliLogger.errorInstance(error, "Failed to restart the server");
				} else {
					cliLogger.error("Failed to restart the server", "Unknown error");
				}
			})
			.finally(() => {
				restarting = undefined;
			});
	};

	const shutdown = async () => {
		// The first signal waits for a restart to finish, which may hang on its migrations, so a second exits straight away.
		if (closing) process.exit(130);
		closing = true;

		await restarting;
		cliSpinner.stop();
		await server?.close();
		process.exit(0);
	};

	/** Gives `shutdown` sole control of stop signals to prevent early exits from runtimes such as Miniflare, whose cleanup still runs through server closure and process exit hooks. */
	const ownShutdownSignals = () => {
		for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
			process.removeAllListeners(signal);
			process.on(signal, shutdown);
		}
	};

	/** Set up on every server Vite creates, so restarts it or other plugins start get the same treatment. */
	const cliPlugin: Plugin = {
		name: "lucid:cli-dev",
		// Show the runtime startup message after project loading only for the first server, preserving restart messages.
		configResolved(config) {
			if (!server) {
				cliSpinner.start(findLucidViteApi(config.plugins).startMessage);
			}
		},
		configureServer(created) {
			const api = findLucidViteApi(created.config.plugins);
			watchProject(created, {
				inputs: [
					api.project.configPath,
					...api.project.configDependencies,
					...api.project.resources.watch,
					...watchPaths,
				],
				onChange: requestRestart,
			});

			const restart = created.restart.bind(created);
			created.restart = async (forceOptimize) => {
				const elapsed = cliLogger.startTimer();
				const reason = restartReason;
				restartReason = undefined;

				cliSpinner.start(
					reason ? `${reason}, restarting` : "Restarting the server",
				);

				// The new server's logs follow the restart line, as the first server's follow the banner.
				startLoggerBuffering();
				try {
					// Vite restarts from the config's inline config, the object every server shares.
					created.config.inlineConfig.plugins = [
						...(createViteConfig({
							configPath: api.project.configPath,
							mode: "development",
							remote: options?.remote,
						}).plugins ?? []),
						cliPlugin,
					];
					await restart(forceOptimize);
				} catch (error) {
					cliSpinner.stop();
					await stopLoggerBuffering();
					throw error;
				}

				ownShutdownSignals();

				// Vite copies the new server onto the running one, so `server` holds the result.
				const next = server && findLucidViteApi(server.config.plugins);
				if (!next || next === api) {
					cliSpinner.stop();
					cliLogger.info(
						"The last working server is still running. Save a file to retry.",
					);
					await stopLoggerBuffering();
					return;
				}

				cliSpinner.start("Running migrations");
				const ready = await next.ready;
				cliSpinner.stop();

				const time = cliLogger.formatMilliseconds(elapsed());
				logRestart(
					reason
						? `${reason}, restarted in ${time}`
						: `Server restarted in ${time}`,
				);

				await stopLoggerBuffering();
				if (!ready) warnMigrationsIncomplete();
			};
		},
	};

	try {
		const elapsed = cliLogger.startTimer();
		const inlineConfig = createViteConfig({
			configPath: getConfigPath(process.cwd()),
			mode: "development",
			remote: options?.remote,
		});
		inlineConfig.plugins = [...(inlineConfig.plugins ?? []), cliPlugin];

		// Runtime logs from starting up follow the banner rather than interrupting it.
		startLoggerBuffering();
		cliSpinner.start("Loading project");
		server = await createServer(inlineConfig);
		ownShutdownSignals();

		const { project, ready } = findLucidViteApi(server.config.plugins);
		telemetryReporter = createCommandTelemetryReporter({
			config: project.config,
			env: project.env,
			runtimeContext: project.runtimeContext,
			projectRoot: project.projectRoot,
			command: "dev",
			startedAt: commandStartedAt,
		});

		await server.listen();
		cliSpinner.start("Running migrations");
		const migrated = await ready;

		logServerReady({
			url: getServerUrl(server.resolvedUrls, server.httpServer?.address()),
			site: project.config.urls.site,
			apiDocs: project.config.http.openAPI.enabled,
			heading: "Development server ready",
			elapsed: elapsed(),
		});

		await stopLoggerBuffering();
		if (!migrated) warnMigrationsIncomplete();

		void telemetryReporter.report({
			outcome: "succeeded",
			stage: "server_listen",
		});
		void coreUpdateAvailable.then((update) => update?.renderUpdateBox());
	} catch (error) {
		cliSpinner.stop();
		await server?.close();
		await stopLoggerBuffering();

		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Failed to start the server");
		} else {
			cliLogger.error("Failed to start the server", "Unknown error");
		}

		await telemetryReporter?.report({
			outcome: "failed",
			stage: "runtime_initialization",
		});
		process.exit(1);
	}
};

export default devCommand;
