import loadConfigFile from "../../config/load-config-file.js";
import getConfigPath from "../../config/get-config-path.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import prerenderMjmlTemplates from "../../email/prerender-mjml-templates.js";
import createDevLogger from "../logger/dev-logger.js";
import migrateCommand from "./migrate.js";
import copyStaticAssets from "../utils/copy-static-assets.js";

/**
 * The CLI serve command. Directly starts the dev server
 */
const serveCommand = async (options?: {
	initial?: boolean;
}) => {
	await installOptionalDeps();
	const configPath = getConfigPath(process.cwd());
	const logger = createDevLogger();
	let destroy: (() => Promise<void>) | undefined = undefined;

	const isInitialRun = options?.initial ?? false;

	try {
		const configRes = await loadConfigFile({
			path: configPath,
		});
		const migrateResult = await migrateCommand({
			config: configRes.config,
			mode: "return",
		})({
			skipSyncSteps: !isInitialRun,
		});
		if (!migrateResult) process.exit(2);

		await prerenderMjmlTemplates(configRes.config);
		await copyStaticAssets(configRes.config);

		destroy = await configRes.adapter?.cli?.serve(configRes.config, logger);
	} catch (error) {
		logger.error("Failed to start server", error);
		process.exit(1);
	}

	const shutdown = async () => {
		try {
			await destroy?.();
		} catch (error) {
			logger.error("Error during shutdown", error);
		}
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
};

export default serveCommand;
