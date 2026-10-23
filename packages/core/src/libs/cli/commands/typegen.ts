import path from "node:path";
import getConfigPath from "../../config/get-config-path.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import loadPluginClis from "../../plugins/load-plugin-clis.js";
import runPluginPrepares from "../../plugins/run-plugin-prepares.js";
import generateProjectTypes from "../../vite/generate-project-types.js";
import loadProject from "../../vite/load-project.js";
import cliLogger from "../logger.js";

/** Loads the project as Lucid's Vite plugin does and writes only generated types. */
const typegenCommand = async () => {
	startLoggerBuffering();
	const startTime = cliLogger.startTimer();

	try {
		const configPath = getConfigPath(process.cwd());
		const { project } = await loadProject(configPath);
		await Promise.all([
			generateProjectTypes(project),
			runPluginPrepares({
				command: "typegen",
				config: project.config,
				projectRoot: project.projectRoot,
				clis: await loadPluginClis(project.config, project.projectRoot),
			}),
		]);

		cliLogger.info(
			"Loaded config from:",
			cliLogger.color.green(`./${path.relative(process.cwd(), configPath)}`),
		);

		const endTime = startTime();
		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			"Type generation completed",
			cliLogger.color.green("successfully"),
			"in",
			cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
			{
				spaceAfter: true,
				spaceBefore: true,
			},
		);

		await stopLoggerBuffering();
		process.exit(0);
	} catch (error) {
		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Failed to generate types");
		} else {
			cliLogger.error("Failed to generate types", "Unknown error");
		}

		await stopLoggerBuffering();
		process.exit(1);
	}
};

export default typegenCommand;
