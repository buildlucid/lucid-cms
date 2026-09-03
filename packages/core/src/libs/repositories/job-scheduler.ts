import type { LucidDatabase } from "../db/client/index.js";
import { jobSchedulerTable } from "../db/tables/job-scheduler.js";
import StaticRepository from "./parents/static-repository.js";

export default class JobSchedulerRepository extends StaticRepository<"lucid_job_scheduler"> {
	constructor(db: LucidDatabase) {
		super(db, jobSchedulerTable);
	}

	// ----------------------------------------
	// creates

	/** Creates the shared scheduler row when it does not exist. */
	async createSingleton(schedulerKey: string) {
		const query = this.db
			.insertInto("lucid_job_scheduler")
			.values({
				scheduler_key: schedulerKey,
				updated_at: new Date().toISOString(),
			})
			.onConflict((conflict) => conflict.column("scheduler_key").doNothing());

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "createSingleton",
		});
		return exec.response;
	}

	// ----------------------------------------
	// queries

	/** Returns the current scheduler cursor. */
	async selectCursor(schedulerKey: string) {
		const query = this.db
			.selectFrom("lucid_job_scheduler")
			.select("cursor_at")
			.where("scheduler_key", "=", schedulerKey);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectCursor",
		});
		return exec.response;
	}

	// ----------------------------------------
	// updates

	/** Advances the cursor without allowing an older tick to move it back. */
	async advanceCursor(props: {
		cursor: string;
		schedulerKey: string;
		updatedAt: string;
	}) {
		const query = this.db
			.updateTable("lucid_job_scheduler")
			.set({ cursor_at: props.cursor, updated_at: props.updatedAt })
			.where("scheduler_key", "=", props.schedulerKey)
			.where((eb) =>
				eb.or([
					eb("cursor_at", "is", null),
					eb("cursor_at", "<", props.cursor),
				]),
			);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "advanceCursor",
		});
		return exec.response;
	}
}
