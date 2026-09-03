import { copy } from "../../libs/i18n/index.js";
import { getRegisteredJobSchedule } from "../../libs/jobs/scheduler/registered-schedules.js";
import { JobScheduleOverridesRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

type ScheduleState = "active" | "paused";

/** Sets or removes the pause override for a registered schedule. */
const setScheduleState: ServiceFn<
	[{ scheduleKey: string; state: ScheduleState; userId?: number }],
	{ scheduleKey: string; state: ScheduleState }
> = async (context, data) => {
	if (!getRegisteredJobSchedule(context, data.scheduleKey)) {
		return {
			error: {
				message: copy("server:core.jobs.schedule.not.found", {
					data: { schedule: data.scheduleKey },
				}),
				status: 404,
			},
			data: undefined,
		};
	}

	const Overrides = new JobScheduleOverridesRepository(context.db);

	const result =
		data.state === "paused"
			? await Overrides.upsertPaused({
					scheduleKey: data.scheduleKey,
					pausedAt: new Date().toISOString(),
					pausedByUserId: data.userId ?? null,
				})
			: await Overrides.deleteSingle({
					where: [
						{
							key: "schedule_key",
							operator: "=",
							value: data.scheduleKey,
						},
					],
					validation: { enabled: false },
				});
	if (result.error) return result;

	return {
		error: undefined,
		data: { scheduleKey: data.scheduleKey, state: data.state },
	};
};

export default setScheduleState;
