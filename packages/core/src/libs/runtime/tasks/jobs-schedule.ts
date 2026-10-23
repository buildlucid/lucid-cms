import z from "zod";
import triggerSchedule from "../../../services/jobs/trigger-schedule.js";
import serviceWrapper from "../../../utils/services/service-wrapper.js";
import cliLogger from "../../cli/logger.js";
import { copy } from "../../i18n/index.js";
import {
	getRegisteredJobSchedules,
	resolveRegisteredJobSchedule,
} from "../../jobs/scheduler/registered-schedules.js";
import createTaskServiceContext from "./create-task-service-context.js";
import defineRuntimeTask from "./define-runtime-task.js";

/** Runs one registered job schedule, found by its key or its job's name, through Lucid's durable job path. */
const jobsScheduleTask = defineRuntimeTask({
	input: z.object({ reference: z.string() }),
	run: async (context, input) => {
		const schedule = resolveRegisteredJobSchedule(
			getRegisteredJobSchedules(context.host),
			input.reference,
		);
		if (!schedule) return { status: "unknown" } as const;

		cliLogger.info(`Running job schedule "${schedule.key}"`);
		const serviceContext = createTaskServiceContext(
			context,
			await context.connect(),
		);

		const result = await serviceWrapper(triggerSchedule, {
			transaction: true,
			defaultError: {
				type: "basic",
				message: copy("server:core.jobs.schedule.trigger.failed"),
			},
		})(serviceContext, { scheduleKey: schedule.key });
		if (result.error) {
			return {
				status: "failed",
				key: schedule.key,
				message:
					serviceContext.translate.english(result.error.message) ??
					"Unknown error",
			} as const;
		}

		return { status: "complete", key: schedule.key } as const;
	},
});

export default jobsScheduleTask;
