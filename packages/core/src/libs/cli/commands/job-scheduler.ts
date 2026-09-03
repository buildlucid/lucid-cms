import { select } from "@inquirer/prompts";
import triggerSchedule from "../../../services/jobs/trigger-schedule.js";
import { LucidError } from "../../../utils/errors/index.js";
import createServiceContext from "../../../utils/services/create-service-context.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import getConfigPath from "../../config/get-config-path.js";
import loadConfigFile from "../../config/load-config-file.js";
import type { DatabaseConnection } from "../../db/types.js";
import { copy } from "../../i18n/index.js";
import prepareTranslations from "../../i18n/prepare-translations.js";
import {
	getRegisteredJobSchedules,
	resolveRegisteredJobSchedule,
} from "../../jobs/scheduler/registered-schedules.js";
import {
	startLoggerBuffering,
	stopLoggerBuffering,
} from "../../logger/index.js";
import inlineQueueAdapter from "../../queue/adapters/inline.js";
import createLucidAdapters, {
	type LucidAdapters,
} from "../../runtime/create-lucid-adapters.js";
import cliLogger from "../logger.js";
import validateEnvVars from "../services/validate-env-vars.js";

/** Runs one registered job schedule through Lucid's durable job path. */
const jobSchedulerCommand = async (jobOrSchedule?: string) => {
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
		const configPath = getConfigPath(process.cwd());
		const configResult = await loadConfigFile({
			path: configPath,
			prepareRuntime: true,
		});
		const { config, env, runtimeContext } = configResult;
		const translations = await prepareTranslations({
			config,
			projectRoot: configResult.projectRoot,
		});
		const envValid = await validateEnvVars({
			envSchema: configResult.envSchema,
			env,
		});
		if (!envValid) {
			await stopLoggerBuffering();
			process.exit(1);
		}

		adapters = await createLucidAdapters({
			config,
			env,
			runtimeContext,
			overrides: { queue: inlineQueueAdapter() },
		});
		database = await config.db.connect(env);
		const context = createServiceContext({
			config,
			database,
			translationStore: translations.translationStore,
			env,
			runtimeContext,
			...adapters.instances,
		});
		const registeredSchedules = getRegisteredJobSchedules(context);
		const sortedSchedules = [...registeredSchedules].sort((a, b) =>
			a.key.localeCompare(b.key),
		);
		if (registeredSchedules.length === 0) {
			throw new LucidError({
				message: "No job schedules are registered.",
			});
		}

		let selectedReference = jobOrSchedule;
		if (!selectedReference) {
			try {
				selectedReference = await select<string>({
					message: "Select a job schedule to run:",
					choices: sortedSchedules.map((schedule) => ({
						name: `${schedule.key} (${schedule.schedule.cron} · ${schedule.schedule.timezone})`,
						value: schedule.key,
					})),
				});
			} catch (error) {
				if (error instanceof Error && error.name === "ExitPromptError") {
					await cleanup();
					await stopLoggerBuffering();
					process.exit(0);
				}
				throw error;
			}
		}

		const selectedSchedule = resolveRegisteredJobSchedule(
			registeredSchedules,
			selectedReference,
		);
		if (!selectedSchedule) {
			throw new LucidError({
				message: `Unknown job or schedule "${selectedReference}". Available schedules: ${sortedSchedules.map((schedule) => schedule.key).join(", ")}.`,
			});
		}
		const selectedScheduleKey = selectedSchedule.key;

		cliLogger.info(`Running job schedule "${selectedScheduleKey}"`);
		const result = await serviceWrapper(triggerSchedule, {
			transaction: true,
			defaultError: {
				type: "basic",
				message: copy("server:core.jobs.schedule.trigger.failed"),
			},
		})(context, { scheduleKey: selectedScheduleKey });
		if (result.error) {
			cliLogger.error(
				`Failed to run job schedule "${selectedScheduleKey}"`,
				context.translate.english(result.error.message) ?? "Unknown error",
			);
			await cleanup();
			await stopLoggerBuffering();
			process.exit(1);
		}

		const duration = startTime();
		cliLogger.log(
			cliLogger.createBadge("LUCID CMS"),
			`Job schedule "${selectedScheduleKey}" triggered`,
			cliLogger.color.green("successfully"),
			"in",
			cliLogger.color.green(cliLogger.formatMilliseconds(duration)),
			{ spaceAfter: true, spaceBefore: true },
		);

		await cleanup();
		await stopLoggerBuffering();
		process.exit(0);
	} catch (error) {
		await cleanup();
		if (error instanceof Error) {
			cliLogger.errorInstance(error, "Failed to run job schedule");
		} else {
			cliLogger.error("Failed to run job schedule", "Unknown error");
		}
		await stopLoggerBuffering();
		process.exit(1);
	}
};

export default jobSchedulerCommand;
