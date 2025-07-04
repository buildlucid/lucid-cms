import { rm } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import vite from "../../vite/index.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import prerenderMjmlTemplates from "../../email/prerender-mjml-templates.js";
import createBuildLogger from "../logger/build-logger.js";
import constants from "../../../constants/constants.js";
import copyStaticAssets from "../utils/copy-static-assets.js";

/**
 * The CLI build command. Responsible for calling the adapters build handler.
 */
const buildCommand = async (options?: {
	cacheSpa?: boolean;
	silent?: boolean;
}) => {
	await installOptionalDeps();
	const overallStartTime = process.hrtime();
	const configPath = getConfigPath(process.cwd());
	const configRes = await loadConfigFile({ path: configPath });

	const logger = createBuildLogger(options?.silent);

	logger.buildStart();

	try {
		if (options?.cacheSpa) {
			await clearOutputDirExceptSpa(configRes.config.compilerOptions?.outDir);
		} else {
			await rm(configRes.config.compilerOptions?.outDir, {
				recursive: true,
				force: true,
			});
		}

		await prerenderMjmlTemplates(configRes.config);
		await copyStaticAssets(configRes.config);

		if (!configRes.adapter?.cli?.build) {
			logger.info("No build handler found in adapter");
			return;
		}

		const [viteBuildRes] = await Promise.all([
			vite.buildApp(configRes.config, undefined, options?.silent),
			configRes.adapter.cli.build(
				configRes.config,
				{
					configPath,
					outputPath: configRes.config.compilerOptions?.outDir,
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

/**
 * Clear output directory while preserving SPA build output
 */
const clearOutputDirExceptSpa = async (outDir: string | undefined) => {
	if (!outDir) return;

	const items = await readdir(outDir);
	const spaDir = constants.vite.outputDir;

	for (const item of items) {
		if (item !== spaDir) {
			const itemPath = join(outDir, item);
			await rm(itemPath, { recursive: true, force: true });
		}
	}
};

export default buildCommand;
