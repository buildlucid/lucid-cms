import type { LucidDatabase } from "../db/client/index.js";
import {
	type RequestEventInsert,
	requestEventsTable,
} from "../db/tables/request-events.js";
import StaticRepository from "./parents/static-repository.js";

export default class RequestEventsRepository extends StaticRepository<"lucid_request_events"> {
	constructor(db: LucidDatabase) {
		super(db, requestEventsTable);
	}
	/** Records activity, checking each event's metadata against its type. */
	async createEvents(props: { data: RequestEventInsert[] }) {
		const query = this.db
			.insertInto("lucid_request_events")
			.values(props.data)
			.returning("id");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "createEvents",
		});
		return exec.response;
	}
	/** The latest publication failure, used to add diagnostics to a reconciled attempt. */
	async selectLatestFailure(props: { requestId: number }) {
		const query = this.db
			.selectFrom("lucid_request_events")
			.select(["id", "metadata"])
			.where("request_id", "=", props.requestId)
			.where("type", "=", "failed")
			.orderBy("id", "desc");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectLatestFailure",
		});
		return exec.response;
	}
}
