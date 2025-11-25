import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import prerenderMjmlTemplates from "../../email-adapter/templates/prerender-mjml-templates.js";
import generateTypes from "../../type-generation/index.js";
import vite from "../../vite/index.js";
import copyPublicAssets from "../services/copy-public-assets.js";
import validateEnvVars from "../services/validate-env-vars.js";
import migrateCommand from "./migrate.js";
import logger from "../../logger/index.js";
import cliLogger from "../logger.js";
import constants from "../../../constants/constants.js";
import updateAvailable from "../services/update-available.js";
import checkAllPluginsCompatibility from "../../plugins/check-all-plugins-compatibility.js";

/**
 * The CLI serve command. Directly starts the dev server
 */
const serveCommand = async () => {
	logger.setBuffering(true);
	const configPath = getConfigPath(process.cwd());
	let destroy: (() => Promise<void>) | undefined;
	const coreUpdateAvailable = updateAvailable();

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

	try {
		const configRes = await loadConfigFile({
			path: configPath,
		});

		if (!configRes.adapter) {
			cliLogger.error("No runtime adapter found");
			logger.setBuffering(false);
			process.exit(1);
		}

		const envValid = await validateEnvVars({
			envSchema: configRes.envSchema,
			env: configRes.env,
		});

		generateTypes({
			envSchema: configRes.envSchema,
			configPath: configPath,
		});

		if (!envValid) {
			logger.setBuffering(false);
			process.exit(1);
		}

		const migrateResult = await migrateCommand({
			config: configRes.config,
			mode: "return",
		})({
			skipSyncSteps: false,
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

		const [mjmlTemplatesRes, publicAssetsRes] = await Promise.all([
			prerenderMjmlTemplates({
				config: configRes.config,
				silent: false,
			}),
			copyPublicAssets({
				config: configRes.config,
				silent: false,
			}),
		]);
		if (mjmlTemplatesRes.error) {
			cliLogger.error(
				mjmlTemplatesRes.error.message ?? "Failed to pre-render MJML templates",
			);
			process.exit(1);
		}
		if (publicAssetsRes.error) {
			cliLogger.error(
				publicAssetsRes.error.message ?? "Failed to copy public assets",
			);
			process.exit(1);
		}

		const serverRes = await configRes.adapter.cli.serve({
			config: configRes.config,
			logger: {
				instance: cliLogger,
				silent: false,
			},
			onListening: async (props) => {
				const serverUrl =
					typeof props.address === "string"
						? props.address
						: props.address
							? `http://${props.address.address === "::" ? "localhost" : props.address.address}:${props.address.port}`
							: "unknown";

				const coreUpdateAvailabeRes = await coreUpdateAvailable;
				coreUpdateAvailabeRes.renderUpdateBox();

				cliLogger.log(
					cliLogger.createBadge("LUCID CMS"),
					"Development server ready",
					{
						spaceBefore: !coreUpdateAvailabeRes.show,
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

		await checkAllPluginsCompatibility({
			runtimeContext: serverRes.runtimeContext,
			config: configRes.config,
		});

		await serverRes?.onComplete?.();
	} catch (error) {
		await destroy?.();
		if (error instanceof Error) {
			cliLogger.errorInstance(error);
		}
		cliLogger.error("Failed to start the server");
		logger.setBuffering(false);
		process.exit(1);
	}

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
};

export default serveCommand;
