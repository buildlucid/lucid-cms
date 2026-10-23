import z from "zod";
import { getRegisteredJobSchedules } from "../../jobs/scheduler/registered-schedules.js";
import defineRuntimeTask from "./define-runtime-task.js";

/** Lists registered job schedules, sorted by key. */
const jobsListTask = defineRuntimeTask({
	input: z.object({}),
	run: async (context) =>
		getRegisteredJobSchedules(context.host)
			.map(({ key, schedule }) => ({
				key,
				cron: schedule.cron,
				timezone: schedule.timezone,
			}))
			.sort((a, b) => a.key.localeCompare(b.key)),
});

export default jobsListTask;
