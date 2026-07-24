import constants from "../../../constants/constants.js";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import prepareEmailTemplates from "../../email/templates/prepare-email-templates.js";
import { createTranslator } from "../../i18n/index.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import checkAllPluginsCompatibility from "../../plugins/check-all-plugins-compatibility.js";
import generateTypes from "../../type-generation/index.js";
import vite from "../../vite/index.js";
import cliLogger from "../logger.js";
import copyPublicAssets from "../services/copy-public-assets.js";
import updateAvailable from "../services/update-available.js";
import validateEnvVars from "../services/validate-env-vars.js";
import migrateCommand from "./migrate.js";

/**
 * The CLI serve command. Directly starts the dev server
 */
const serveCommand = async () => {
	startLoggerBuffering();
	const configPath = getConfigPath(process.cwd());
	let destroy: (() => Promise<void>) | undefined;
	const coreUpdateAvailable = updateAvailable();

	let shutdownPromise: Promise<void> | undefined;
	const shutdown = () => {
		shutdownPromise ??= (async () => {
			try {
				await destroy?.();
			} catch (error) {
				if (error instanceof Error) {
					cliLogger.errorInstance(error, "Error during shutdown");
				} else {
					cliLogger.error("Error during shutdown", "Unknown error");
				}
			}
			await stopLoggerBuffering();
			process.exit(0);
		})();
		return shutdownPromise;
	};

	try {
		const configRes = await loadConfigFile({
			path: configPath,
			prepareRuntime: true,
		});
		const translations = await prepareTranslations({
			config: configRes.config,
			projectRoot: configRes.projectRoot,
			outputPath: configRes.config.build.paths.outDir,
		});
		const translationStore = translations.translationStore;
		const translate = createTranslator({
			store: translationStore,
			locale: "en",
		});
		const adapterCLI = configRes.adapter.cli;

		if (!adapterCLI) {
			cliLogger.error(
				`Lucid could not load CLI handlers from the "${configRes.adapter.key}" runtime adapter.`,
			);
			await stopLoggerBuffering();
			process.exit(1);
		}

		const envValid = await validateEnvVars({
			envSchema: configRes.envSchema,
			env: configRes.env,
		});

		generateTypes({
			envSchema: configRes.envSchema,
			configPath: configPath,
			projectRoot: configRes.projectRoot,
			collections: configRes.config.collections,
			localization: configRes.config.localization,
		});

		if (!envValid) {
			await stopLoggerBuffering();
			process.exit(1);
		}

		const migrateResult = await migrateCommand({
			config: configRes.config,
			env: configRes.env,
			runtimeContext: configRes.runtimeContext,
			translationStore,
			projectRoot: configRes.projectRoot,
			mode: "return",
		})({
			skipSyncSteps: false,
			skipEnvValidation: true,
		});
		if (!migrateResult) {
			await stopLoggerBuffering();
			process.exit(2);
		}

		const viteBuildRes = await vite.buildApp(configRes.config);
		if (viteBuildRes.error) {
			cliLogger.error(
				translate.english(viteBuildRes.error.message) ?? "Failed to build app",
			);
			process.exit(1);
		}

		const [emailTemplatesRes, publicAssetsRes] = await Promise.all([
			prepareEmailTemplates({
				config: configRes.config,
				silent: false,
				verbose: false,
			}),
			copyPublicAssets({
				config: configRes.config,
				silent: false,
				verbose: false,
			}),
		]);
		if (emailTemplatesRes.error) {
			cliLogger.error(
				translate.english(emailTemplatesRes.error.message) ??
					"Failed to prepare email templates",
			);
			process.exit(1);
		}
		if (publicAssetsRes.error) {
			cliLogger.error(
				translate.english(publicAssetsRes.error.message) ??
					"Failed to copy public assets",
			);
			process.exit(1);
		}
		cliLogger.success(
			"Email templates and public assets prepared",
			cliLogger.color.green("successfully"),
		);

		const serverRes = await adapterCLI.serve({
			config: configRes.config,
			translationStore,
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
					cliLogger.color.blue(`${serverUrl}/lucid`),
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

				await stopLoggerBuffering();
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
			cliLogger.errorInstance(error, "Failed to start the server");
		} else {
			cliLogger.error("Failed to start the server", "Unknown error");
		}
		await stopLoggerBuffering();
		process.exit(1);
	}

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
};

export default serveCommand;
