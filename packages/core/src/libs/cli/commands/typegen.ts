import path from "node:path";
import loadBuildProject from "../../compile/load-build-project.js";
import logger from "../../logger/index.js";
import cliLogger from "../logger.js";

/**
 * The CLI typegen command. Resolves the Lucid project and writes the generated type files only.
 */
const typegenCommand = async () => {
	logger.setBuffering(true);
	const startTime = cliLogger.startTimer();

	try {
		const buildProject = await loadBuildProject({
			silent: false,
			generateTypes: true,
			renderEmailTemplates: false,
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

		logger.setBuffering(false);
		process.exit(0);
	} catch (error) {
		if (error instanceof Error) {
			cliLogger.errorInstance(error);
		}
		cliLogger.error("Failed to generate types");
		logger.setBuffering(false);
		process.exit(1);
	}
};

export default typegenCommand;
