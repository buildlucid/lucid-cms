import getConfigPath from "../../config/get-config-path.js";
import createCommandTelemetryReporter, {
	type CommandTelemetryReporter,
} from "../../telemetry/command-reporter.js";
import cliLogger from "../logger.js";
import buildProject from "../services/build-project.js";
import cliSpinner from "../spinner.js";

/** Builds every environment of the project with Vite, using the runtime adapter's Vite integration for the server. */
const buildCommand = async (options?: { silent?: boolean }) => {
	const commandStartedAt = Date.now();
	const silent = options?.silent ?? false;
	let telemetryReporter: CommandTelemetryReporter | undefined;

	try {
		await buildProject({
			configPath: getConfigPath(process.cwd()),
			silent,
			onProject: (project) => {
				telemetryReporter = createCommandTelemetryReporter({
					config: project.config,
					env: project.env,
					runtimeContext: project.runtimeContext,
					projectRoot: project.projectRoot,
					command: "build",
					startedAt: commandStartedAt,
				});
			},
		});

		await telemetryReporter?.report({
			outcome: "succeeded",
			stage: "finalize",
		});
		process.exit(0);
	} catch (error) {
		cliSpinner.stop();

		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Failed to build the application");
		} else {
			cliLogger.error("Failed to build the application", "Unknown error");
		}

		await telemetryReporter?.report({
			outcome: "failed",
			stage: "runtime_build",
		});
		process.exit(1);
	}
};

export default buildCommand;
