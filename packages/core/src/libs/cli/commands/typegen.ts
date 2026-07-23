import path from "node:path";
import loadBuildProject from "../../compile/load-build-project.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import cliLogger from "../logger.js";

/**
 * The CLI typegen command. Resolves the Lucid project and writes the generated type files only.
 */
const typegenCommand = async () => {
	startLoggerBuffering();
	const startTime = cliLogger.startTimer();

	try {
		const buildProject = await loadBuildProject({
			silent: false,
			generateTypes: true,
			loadEmailTemplates: false,
			prepareRuntime: true,
		});

		const relativeConfigPath = path.relative(
			process.cwd(),
			buildProject.configPath,
		);
		cliLogger.info(
			"Loaded config from:",
			cliLogger.color.green(`./${relativeConfigPath}`),
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
