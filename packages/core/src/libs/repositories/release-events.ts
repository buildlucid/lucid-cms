import type { LucidDatabase } from "../db/client/index.js";
import {
	type ReleaseEventInsert,
	releaseEventsTable,
} from "../db/tables/release-events.js";
import StaticRepository from "./parents/static-repository.js";

export default class ReleaseEventsRepository extends StaticRepository<"lucid_release_events"> {
	constructor(db: LucidDatabase) {
		super(db, releaseEventsTable);
	}
	/** Records activity, checking each event's metadata against its type. */
	async createEvents(props: { data: ReleaseEventInsert[] }) {
		const query = this.db
			.insertInto("lucid_release_events")
			.values(props.data)
			.returning("id");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "createEvents",
		});
		return exec.response;
	}
	/** The latest publication failure, used to add diagnostics to a reconciled attempt. */
	async selectLatestFailure(props: { releaseId: number }) {
		const query = this.db
			.selectFrom("lucid_release_events")
			.select(["id", "metadata"])
			.where("release_id", "=", props.releaseId)
			.where("type", "=", "failed")
			.orderBy("id", "desc");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectLatestFailure",
		});
		return exec.response;
	}
}
