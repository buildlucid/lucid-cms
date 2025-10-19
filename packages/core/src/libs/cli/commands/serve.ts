import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import prerenderMjmlTemplates from "../../email-adapter/templates/prerender-mjml-templates.js";
import generateTypes from "../../type-generation/index.js";
import vite from "../../vite/index.js";
import copyPublicAssets from "../utils/copy-public-assets.js";
import validateEnvVars from "../utils/validate-env-vars.js";
import migrateCommand from "./migrate.js";
import logger from "../../logger/index.js";
import cliLogger from "../logger.js";
import constants from "../../../constants/constants.js";

/**
 * The CLI serve command. Directly starts the dev server
 */
const serveCommand = async (options?: {
	initial?: boolean;
}) => {
	logger.setBuffering(true);
	const configPath = getConfigPath(process.cwd());
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
			cliLogger.error("Environment variable validation failed");
			envValid.message && cliLogger.error(envValid.message);
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
			cliLogger.error(viteBuildRes.error.message ?? "Failed to build app");
			process.exit(1);
		}

		await Promise.all([
			prerenderMjmlTemplates(configRes.config),
			copyPublicAssets(configRes.config),
		]);

		const serverRes = await configRes.adapter?.cli?.serve({
			config: configRes.config,
			logger: cliLogger,
			onListening: async (props) => {
				const serverUrl =
					typeof props.address === "string"
						? props.address
						: props.address
							? `http://${props.address.address === "::" ? "localhost" : props.address.address}:${props.address.port}`
							: "unknown";

				cliLogger.log(
					cliLogger.createBadge("LUCID CMS"),
					"Development server ready",
					{
						spaceBefore: true,
						spaceAfter: true,
					},
				);

				cliLogger.log(
					"🔐 Admin panel      ",
					cliLogger.color.blue(`${serverUrl}/admin`),
					{ symbol: "line" },
				);

				cliLogger.log(
					"📖 Documentation    ",
					cliLogger.color.blue(constants.documentation),
					{ symbol: "line" },
				);

				cliLogger.log(cliLogger.color.gray("Press CTRL-C to stop the server"), {
					spaceBefore: true,
					spaceAfter: true,
				});
				logger.setBuffering(false);
			},
		});
		destroy = serverRes?.destroy;

		await serverRes?.onComplete?.();
	} catch (error) {
		cliLogger.error("Failed to start the server");
		if (error instanceof Error) {
			cliLogger.errorInstance(error);
		}
		logger.setBuffering(false);
		process.exit(1);
	}

	const shutdown = async () => {
		try {
			await destroy?.();
		} catch (error) {
			cliLogger.error("Error during shutdown");
			if (error instanceof Error) {
				cliLogger.errorInstance(error);
			}
		}
		logger.setBuffering(false);
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
};

export default serveCommand;
