import path from "node:path";
import { type PreviewServer, preview } from "vite";
import getConfigPath from "../../config/get-config-path.js";
import readConfigHost from "../../config/read-config-host.js";
import createCommandTelemetryReporter, {
	type CommandTelemetryReporter,
} from "../../telemetry/command-reporter.js";
import type { TelemetryStage } from "../../telemetry/types.js";
import assertNoHost from "../../vite/assert-no-host.js";
import runMigrateTask from "../../vite/run-migrate-task.js";
import cliLogger from "../logger.js";
import buildProject from "../services/build-project.js";
import createViteConfig from "../services/create-vite-config.js";
import { getServerUrl, logServerReady } from "../services/server-logger.js";
import startTaskServer from "../services/start-task-server.js";
import updateAvailable from "../services/update-available.js";
import cliSpinner from "../spinner.js";

/** Runs migrations before building and previewing the deployed app through the runtime adapter, keeping migration servers outside the build's `NODE_ENV`. */
const serveCommand = async () => {
	const commandStartedAt = Date.now();
	const coreUpdateAvailable = updateAvailable().catch(() => undefined);
	let server: PreviewServer | undefined;
	let telemetryReporter: CommandTelemetryReporter | undefined;
	let stage: TelemetryStage = "migration";

	try {
		const configPath = getConfigPath(process.cwd());

		// A host serves the project instead, so it fails before running migrations.
		await assertNoHost(
			await readConfigHost(configPath),
			path.dirname(configPath),
		);

		// Migrations load the env the build does, so they reach the database the preview uses.
		const tasks = await startTaskServer({ mode: "production" });
		cliSpinner.start("Running migrations");
		const migration = await runMigrateTask(tasks.run, { quiet: true }).finally(
			tasks.close,
		);
		// Exits as `lucidcms migrate` does: refusing a destructive migration or a failure is an error, declining isn't.
		if (migration.status !== "complete") {
			cliSpinner.stop();
			process.exit(
				migration.status === "declined" &&
					migration.gate !== "reject-destructive"
					? 0
					: 1,
			);
		}

		stage = "runtime_build";
		const project = await buildProject({
			configPath,
			silent: false,
			step: true,
			preview: true,
			onProject: (loaded) => {
				telemetryReporter = createCommandTelemetryReporter({
					config: loaded.config,
					env: loaded.env,
					runtimeContext: loaded.runtimeContext,
					projectRoot: loaded.projectRoot,
					command: "serve",
					startedAt: commandStartedAt,
				});
			},
		});

		stage = "server_listen";
		cliSpinner.start("Starting the server");
		// The build just prepared the project.
		server = await preview(
			createViteConfig({
				configPath,
				mode: "production",
				logLevel: "warn",
				prepare: false,
			}),
		);

		logServerReady({
			url: getServerUrl(server.resolvedUrls, server.httpServer.address()),
			site: project.config.urls.site,
			apiDocs: project.config.http.openAPI.enabled,
			heading: "Serving the build",
		});

		void telemetryReporter?.report({ outcome: "succeeded", stage });
		void coreUpdateAvailable.then((update) => update?.renderUpdateBox());
	} catch (error) {
		cliSpinner.stop();
		await server?.close();

		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Failed to serve the application");
		} else {
			cliLogger.error("Failed to serve the application", "Unknown error");
		}

		await telemetryReporter?.report({ outcome: "failed", stage });
		process.exit(1);
	}

	let closing = false;
	const shutdown = async () => {
		if (closing) return;
		closing = true;
		await server?.close();
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
};

export default serveCommand;
