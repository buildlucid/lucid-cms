import { select } from "@inquirer/prompts";
import createServiceContext from "../../../utils/services/create-service-context.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import type { DatabaseConnection } from "../../db/types.js";
import { copy } from "../../i18n/index.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import inlineQueueAdapter from "../../queue/adapters/inline.js";
import createLucidAdapters, {
	type LucidAdapters,
} from "../../runtime/create-lucid-adapters.js";
import getCronJobs, { type CronJobKey } from "../../runtime/cron-jobs.js";
import cliLogger from "../logger.js";
import validateEnvVars from "../services/validate-env-vars.js";

const cronCommand = async (jobName?: string) => {
	let adapters: LucidAdapters | undefined;
	let database: DatabaseConnection | undefined;

	const cleanup = async () => {
		if (adapters) await adapters.destroy();
		if (database) await database.destroy();
		adapters = undefined;
		database = undefined;
	};

	try {
		startLoggerBuffering();
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
				await stopLoggerBuffering();
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
					await stopLoggerBuffering();
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
			prepareRuntime: true,
		});
		const config = configRes.config;
		const runtimeContext = configRes.runtimeContext;
		const translationStore = (
			await prepareTranslations({
				config,
				projectRoot: configRes.projectRoot,
			})
		).translationStore;
		const env = configRes.env;
		const envValid = await validateEnvVars({
			envSchema: configRes.envSchema,
			env: configRes.env,
		});
		if (!envValid) {
			await stopLoggerBuffering();
			process.exit(1);
		}

		//* create an inline queue adapter so
		//* any jobs pushed to the queue by the cron are executed straight away
		const queue = inlineQueueAdapter();
		adapters = await createLucidAdapters({
			config,
			env,
			runtimeContext,
			overrides: { queue },
		});
		const activeAdapters = adapters;
		database = await config.db.connect(env);
		const activeDatabase = database;

		const serviceContext = createServiceContext({
			config,
			database: activeDatabase,
			translationStore,
			env,
			runtimeContext,
			...activeAdapters.instances,
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
			})(serviceContext);

			if (!result.error) {
				success = true;
				break;
			}

			lastError =
				serviceContext.translate.english(result.error.message) ??
				"Unknown error";

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
			await cleanup();
			await stopLoggerBuffering();
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

		await cleanup();
		await stopLoggerBuffering();
		process.exit(0);
	} catch (error) {
		await cleanup();
		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Failed to run cron job");
		} else {
			cliLogger.error("Failed to run cron job", "Unknown error");
		}
		await stopLoggerBuffering();
		process.exit(1);
	}
};

export default cronCommand;
