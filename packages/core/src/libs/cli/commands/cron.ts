import { select } from "@inquirer/prompts";
import constants from "../../../constants/constants.js";
import type { Config } from "../../../types.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import {
	destroyEmailAdapter,
	getInitializedEmailAdapter,
} from "../../email/lifecycle.js";
import type { EmailAdapterInstance } from "../../email/types.js";
import { copy, createTranslator } from "../../i18n/index.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import type { TranslationStore } from "../../i18n/types.js";
import {
	destroyKVAdapter,
	getInitializedKVAdapter,
} from "../../kv/lifecycle.js";
import type { KVAdapterInstance } from "../../kv/types.js";
import logger from "../../logger/index.js";
import {
	destroyMediaAdapter,
	getInitializedMediaAdapter,
} from "../../media/lifecycle.js";
import type { MediaAdapterInstance } from "../../media/types.js";
import passthroughQueueAdapter from "../../queue/adapters/passthrough.js";
import getCronJobs, { type CronJobKey } from "../../runtime/cron-jobs.js";
import type {
	AdapterRuntimeContext,
	EnvironmentVariables,
} from "../../runtime/types.js";
import cliLogger from "../logger.js";
import validateEnvVars from "../services/validate-env-vars.js";

const cronCommand = async (jobName?: string) => {
	let config: Config | undefined;
	let translationStore: TranslationStore | undefined;
	let env: EnvironmentVariables | undefined;
	let runtimeContext: AdapterRuntimeContext | undefined;
	let kv: KVAdapterInstance | undefined;
	let media: MediaAdapterInstance | null | undefined;
	let email: EmailAdapterInstance | undefined;

	const cleanupAdapters = async () => {
		if (config && translationStore) {
			await Promise.allSettled([
				destroyKVAdapter(kv, { config, env, runtimeContext }),
				destroyMediaAdapter(media, { config, env, runtimeContext }),
				destroyEmailAdapter(email, { config, env, runtimeContext }),
			]);
		}
		kv = undefined;
		media = undefined;
		email = undefined;
	};

	try {
		logger.setBuffering(true);
		const startTime = cliLogger.startTimer();
		const cronJobs = getCronJobs();

		//* resolve which cron job to run
		let selectedJob: CronJobKey;

		if (jobName) {
			if (!(jobName in cronJobs)) {
				cliLogger.error(`Unknown cron job "${jobName}". Available jobs:`);
				for (const key of Object.keys(cronJobs)) {
					cliLogger.log(`  ${key}`, { symbol: "bullet" });
				}
				logger.setBuffering(false);
				process.exit(1);
			}
			selectedJob = jobName as CronJobKey;
		} else {
			try {
				selectedJob = await select<CronJobKey>({
					message: "Select a cron job to run:",
					choices: Object.entries(cronJobs).map(([key, value]) => ({
						name: value.label,
						value: key as CronJobKey,
					})),
				});
			} catch (error) {
				if (error instanceof Error && error.name === "ExitPromptError") {
					logger.setBuffering(false);
					process.exit(0);
				}
				throw error;
			}
		}

		const job = cronJobs[selectedJob];

		cliLogger.info(`Running cron job: ${job.label}`);

		//* load config
		const configPath = getConfigPath(process.cwd());
		const configRes = await loadConfigFile({
			path: configPath,
		});
		config = configRes.config;
		runtimeContext = configRes.runtimeContext;
		translationStore = (
			await prepareTranslations({
				config,
				projectRoot: configRes.projectRoot,
			})
		).translationStore;
		env = configRes.env;
		const translate = createTranslator({
			store: translationStore,
			locale: "en",
		});

		const envValid = await validateEnvVars({
			envSchema: configRes.envSchema,
			env: configRes.env,
		});
		if (!envValid) {
			logger.setBuffering(false);
			process.exit(1);
		}

		//* create a passthrough queue adapter with immediate execution enabled so
		//* any jobs pushed to the queue by the cron are executed straight away
		const queue = passthroughQueueAdapter();
		kv = await getInitializedKVAdapter(configRes.config, {
			env,
			runtimeContext,
		});
		media = await getInitializedMediaAdapter(configRes.config, {
			env,
			runtimeContext,
		});
		email = await getInitializedEmailAdapter(configRes.config, {
			env,
			runtimeContext,
		});

		//* run the selected cron job with retry support
		const maxRetries = 3;
		let lastError: string | undefined;
		let success = false;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			const result = await serviceWrapper(job.fn, {
				transaction: job.transaction,
				logError: true,
				defaultError: {
					type: "cron",
					name: copy("server:core.cron.job.error.name"),
					message: job.error,
				},
			})({
				db: { client: configRes.config.db.client },
				config: configRes.config,
				env: env ?? null,
				runtimeContext,
				queue: queue,
				kv,
				media,
				email,
				translate,
				request: {
					url: configRes.config.host ?? constants.urls.localhost,
					locale: "en",
				},
			});

			if (!result.error) {
				success = true;
				break;
			}

			lastError = translate.english(result.error.message) ?? "Unknown error";

			if (attempt < maxRetries) {
				cliLogger.warn(
					`Cron job "${job.label}" failed (attempt ${attempt}/${maxRetries}), retrying...`,
				);
			}
		}

		if (!success) {
			cliLogger.error(
				`Cron job "${job.label}" failed after ${maxRetries} attempts:`,
				lastError ?? "Unknown error",
			);
			await cleanupAdapters();
			logger.setBuffering(false);
			process.exit(1);
		}

		const endTime = startTime();
		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			`Cron job "${job.label}" completed`,
			cliLogger.color.green("successfully"),
			"in",
			cliLogger.color.green(cliLogger.formatMilliseconds(endTime)),
			{
				spaceAfter: true,
				spaceBefore: true,
			},
		);

		await cleanupAdapters();
		logger.setBuffering(false);
		process.exit(0);
	} catch (error) {
		await cleanupAdapters();
		if (error instanceof Error) {
			cliLogger.errorInstance(error);
		}
		cliLogger.error("Failed to run cron job");
		logger.setBuffering(false);
		process.exit(1);
	}
};

export default cronCommand;
