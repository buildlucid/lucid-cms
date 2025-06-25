import loadConfigFile from "../../config/load-config-file.js";
import getConfigPath from "../../config/get-config-path.js";
import installOptionalDeps from "../utils/install-optional-deps.js";
import prerenderMjmlTemplates from "../../email/prerender-mjml-templates.js";
import createDevLogger from "../logger/dev-logger.js";

/**
 * The CLI serve command. Directly starts the dev server
 */
const serveCommand = async () => {
	await installOptionalDeps();
	const configPath = getConfigPath(process.cwd());
	const logger = createDevLogger();
	let destroy: (() => Promise<void>) | undefined = undefined;

	try {
		const res = await loadConfigFile({
			path: configPath,
		});

		await prerenderMjmlTemplates(res.config);

		destroy = await res.adapter?.cli?.serve(res.config, logger);
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
