import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import prerenderMjmlTemplates from "../../email-adapter/templates/prerender-mjml-templates.js";
import generateTypes from "../../type-generation/index.js";
import vite from "../../vite/index.js";
import createDevLogger from "../logger/dev-logger.js";
import copyPublicAssets from "../utils/copy-public-assets.js";
import validateEnvVars from "../utils/validate-env-vars.js";
import migrateCommand from "./migrate.js";
import logger from "../../logger/index.js";

/**
 * The CLI serve command. Directly starts the dev server
 */
const serveCommand = async (options?: {
	initial?: boolean;
	bufferLogs?: boolean;
}) => {
	logger.setBuffering(true);
	const configPath = getConfigPath(process.cwd());
	const devLogger = createDevLogger();
	let destroy: (() => Promise<void>) | undefined;

	const isInitialRun = options?.initial ?? false;

	try {
		const configRes = await loadConfigFile({
			path: configPath,
		});

		const [envValid] = await Promise.all([
			validateEnvVars({
				envSchema: configRes.envSchema,
				env: configRes.env,
			}),
		]);

		generateTypes({
			envSchema: configRes.envSchema,
			configPath: configPath,
		});

		if (!envValid.success) {
			devLogger.envValidationFailed(envValid.message);
			logger.setBuffering(false);
			process.exit(1);
		}

		const migrateResult = await migrateCommand({
			config: configRes.config,
			mode: "return",
		})({
			skipSyncSteps: !isInitialRun,
			skipEnvValidation: true,
		});
		if (!migrateResult) {
			logger.setBuffering(false);
			process.exit(2);
		}

		const viteBuildRes = await vite.buildApp(configRes.config);
		if (viteBuildRes.error) {
			devLogger.error(
				viteBuildRes.error.message ?? "Failed to build app",
				viteBuildRes.error,
			);
			process.exit(1);
		}

		await Promise.all([
			prerenderMjmlTemplates(configRes.config),
			copyPublicAssets(configRes.config),
		]);

		const serverRes = await configRes.adapter?.cli?.serve(
			configRes.config,
			devLogger,
		);
		destroy = serverRes?.destroy;

		await serverRes?.onComplete?.();
	} catch (error) {
		devLogger.error("Failed to start server", error);
		logger.setBuffering(false);
		process.exit(1);
	}

	const shutdown = async () => {
		try {
			await destroy?.();
		} catch (error) {
			devLogger.error("Error during shutdown", error);
		}
		logger.setBuffering(false);
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
};

export default serveCommand;
