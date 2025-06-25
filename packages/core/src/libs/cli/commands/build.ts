import { rm } from "node:fs/promises";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import vite from "../../vite/index.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import prerenderMjmlTemplates from "../../email/prerender-mjml-templates.js";
import createBuildLogger from "../logger/build-logger.js";

/**
 * The CLI build command. Responsible for calling the adapters build handler.
 */
const buildCommand = async () => {
	await installOptionalDeps();
	const overallStartTime = process.hrtime();
	const configPath = getConfigPath(process.cwd());
	const res = await loadConfigFile({ path: configPath });

	const logger = createBuildLogger();

	logger.buildStart();

	try {
		await rm(res.config.compilerOptions?.outDir, {
			recursive: true,
			force: true,
		});

		await prerenderMjmlTemplates(res.config);

		if (!res.adapter?.cli?.build) {
			logger.info("No build handler found in adapter");
			return;
		}

		const [viteBuildRes] = await Promise.all([
			vite.buildApp(res.config),
			res.adapter.cli.build(
				res.config,
				{
					configPath,
					outputPath: res.config.compilerOptions?.outDir,
				},
				logger,
			),
		]);
		if (viteBuildRes.error) {
			logger.buildFailed(viteBuildRes.error);
			process.exit(1);
		}

		logger.buildComplete(overallStartTime);

		process.exit(0);
	} catch (error) {
		logger.buildFailed(error);
		process.exit(1);
	}
};

export default buildCommand;
