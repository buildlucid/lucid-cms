import { select } from "@inquirer/prompts";
import T from "../../../translations/index.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import type { ServiceContext } from "../../../utils/services/types.js";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import passthroughKVAdapter from "../../kv-adapter/adapters/passthrough.js";
import logger from "../../logger/index.js";
import passthroughQueueAdapter from "../../queue-adapter/adapters/passthrough.js";
import cronJobs, { type CronJobKey } from "../../runtime-adapter/cron-jobs.js";
import cliLogger from "../logger.js";
import validateEnvVars from "../services/validate-env-vars.js";

const cronCommand = async (jobName?: string) => {
	try {
		logger.setBuffering(true);
		const startTime = cliLogger.startTimer();

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
		const configRes = await loadConfigFile({ path: configPath });

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
		const kv = passthroughKVAdapter();

		const context: ServiceContext = {
			db: { client: configRes.config.db.client },
			config: configRes.config,
			env: configRes.env ?? null,
			queue: queue,
			kv: kv,
			requestUrl: configRes.config.baseUrl ?? "",
		};

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
					name: T("cron_job_error_name"),
					message: job.error,
				},
			})(context);

			if (!result.error) {
				success = true;
				break;
			}

			lastError = result.error.message ?? "Unknown error";

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

		logger.setBuffering(false);
		process.exit(0);
	} catch (error) {
		if (error instanceof Error) {
			cliLogger.errorInstance(error);
		}
		cliLogger.error("Failed to run cron job");
		logger.setBuffering(false);
		process.exit(1);
	}
};

export default cronCommand;
