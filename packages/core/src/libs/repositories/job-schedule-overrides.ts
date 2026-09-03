import type { LucidDatabase } from "../db/client/index.js";
import { jobScheduleOverridesTable } from "../db/tables/job-schedule-overrides.js";
import StaticRepository from "./parents/static-repository.js";

export default class JobScheduleOverridesRepository extends StaticRepository<"lucid_job_schedule_overrides"> {
	constructor(db: LucidDatabase) {
		super(db, jobScheduleOverridesTable);
	}

	// ----------------------------------------
	// creates

	/** Creates or replaces the pause override for one registered schedule. */
	async upsertPaused(props: {
		scheduleKey: string;
		pausedAt: string;
		pausedByUserId: number | null;
	}) {
		const query = this.db
			.insertInto("lucid_job_schedule_overrides")
			.values({
				schedule_key: props.scheduleKey,
				paused_at: props.pausedAt,
				paused_by_user_id: props.pausedByUserId,
			})
			.onConflict((conflict) =>
				conflict.column("schedule_key").doUpdateSet({
					paused_at: props.pausedAt,
					paused_by_user_id: props.pausedByUserId,
				}),
			);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "upsertPaused",
		});

		return exec.response;
	}
}
