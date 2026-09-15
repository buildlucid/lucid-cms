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
import type { AdapterKeys } from "../../runtime/types.js";
import createCommandTelemetryReporter, {
	type CommandTelemetryReporter,
} from "../../telemetry/command-reporter.js";
import type { TelemetryStage } from "../../telemetry/types.js";
import generateTypes from "../../type-generation/index.js";
import vite from "../../vite/index.js";
import cliLogger from "../logger.js";
import copyPublicAssets from "../services/copy-public-assets.js";
import { getServerUrl, logServerReady } from "../services/server-logger.js";
import updateAvailable from "../services/update-available.js";
import migrateCommand from "./migrate.js";

/**
 * Builds the admin application and serves it alongside the runtime
 */
const serveCommand = async () => {
	startLoggerBuffering();
	const configPath = getConfigPath(process.cwd());
	const commandStartedAt = Date.now();
	let destroy: (() => Promise<void>) | undefined;
	let telemetryReporter: CommandTelemetryReporter | undefined;
	let currentStage: TelemetryStage | undefined;
	let startupListening = false;
	let startupCompleted = false;
	let startupAdapterKeys: AdapterKeys | undefined;
	const coreUpdateAvailable = updateAvailable().catch(() => undefined);

	const maybeReportStartup = () => {
		if (!startupListening || !startupCompleted || !startupAdapterKeys) return;

		void telemetryReporter?.report({
			outcome: "succeeded",
			stage: "server_listen",
			adapterKeys: startupAdapterKeys,
		});
	};

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
		destroy = configRes.adapter.cli?.dispose;
		telemetryReporter = createCommandTelemetryReporter({
			config: configRes.config,
			env: configRes.env,
			runtimeContext: configRes.runtimeContext,
			projectRoot: configRes.projectRoot,
			command: "serve",
			startedAt: commandStartedAt,
		});
		const translations = await prepareTranslations({
			config: configRes.config,
			files: configRes.resources.files.translations,
			outputPath: configRes.config.build.outDir,
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
			await telemetryReporter.report({
				outcome: "failed",
				stage: "runtime_initialization",
			});
			process.exit(1);
		}

		generateTypes({
			envSchema: configRes.envSchema,
			configPath: configPath,
			projectRoot: configRes.projectRoot,
			access: configRes.config.access,
			collections: configRes.config.collections,
			localization: configRes.config.localization,
		});

		currentStage = "migration";
		const migrateResult = await migrateCommand({
			config: configRes.config,
			migrationFiles: configRes.resources.files.migrations,
			env: configRes.env,
			runtimeContext: configRes.runtimeContext,
			translationStore,
			mode: "return",
		})({
			skipSyncSteps: false,
		});
		if (!migrateResult) {
			await stopLoggerBuffering();
			process.exit(2);
		}

		currentStage = "admin_build";
		await vite.buildApp(configRes.config);

		currentStage = "email_templates";
		const [emailTemplatesRes, publicAssetsRes] = await Promise.all([
			prepareEmailTemplates({
				config: configRes.config,
				files: configRes.resources.files.templates,
				silent: false,
				verbose: false,
			}),
			copyPublicAssets({
				config: configRes.config,
				files: configRes.resources.files.public,
				silent: false,
				verbose: false,
			}),
		]);
		if (emailTemplatesRes.error) {
			cliLogger.error(
				translate.english(emailTemplatesRes.error.message) ??
					"Failed to prepare email templates",
			);
			await stopLoggerBuffering();
			await telemetryReporter.report({
				outcome: "failed",
				stage: "email_templates",
			});
			process.exit(1);
		}
		if (publicAssetsRes.error) {
			cliLogger.error(
				translate.english(publicAssetsRes.error.message) ??
					"Failed to copy public assets",
			);
			await stopLoggerBuffering();
			await telemetryReporter.report({
				outcome: "failed",
				stage: "public_assets",
			});
			process.exit(1);
		}
		cliLogger.success(
			"Email templates and public assets prepared",
			cliLogger.color.green("successfully"),
		);

		currentStage = "runtime_initialization";
		const serverRes = await adapterCLI.serve({
			mode: "static",
			projectRoot: configRes.projectRoot,
			env: configRes.env,
			config: configRes.config,
			translationStore,
			logger: {
				instance: cliLogger,
				silent: false,
			},
			onListening: async (props) => {
				startupListening = true;
				startupAdapterKeys = props.adapterKeys;
				maybeReportStartup();

				logServerReady(getServerUrl(props.address));
				void coreUpdateAvailable
					.then((update) => {
						if (!shutdownPromise) update?.renderUpdateBox();
					})
					.catch(() => {});

				await stopLoggerBuffering();
			},
		});
		destroy = serverRes?.destroy;

		currentStage = undefined;
		await checkAllPluginsCompatibility({
			runtimeContext: serverRes.runtimeContext,
			config: configRes.config,
			translate,
		});

		currentStage = "finalize";
		await serverRes?.onComplete?.();
		startupCompleted = true;
		startupAdapterKeys = serverRes.adapterKeys;
		maybeReportStartup();
	} catch (error) {
		await destroy?.();
		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Failed to start the server");
		} else {
			cliLogger.error("Failed to start the server", "Unknown error");
		}
		await stopLoggerBuffering();
		if (currentStage) {
			await telemetryReporter?.report({
				outcome: "failed",
				stage: currentStage,
			});
		}
		process.exit(1);
	}

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
};

export default serveCommand;
