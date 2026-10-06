import type { LucidDatabase } from "../db/client/index.js";
import { requestTargetsTable } from "../db/tables/request-targets.js";
import StaticRepository from "./parents/static-repository.js";

export default class RequestTargetsRepository extends StaticRepository<"lucid_request_targets"> {
	constructor(db: LucidDatabase) {
		super(db, requestTargetsTable);
	}
	async selectForRequest(props: { id: number }) {
		const query = this.db
			.selectFrom("lucid_request_targets")
			.innerJoin(
				"lucid_request_documents",
				"lucid_request_documents.id",
				"lucid_request_targets.request_document_id",
			)
			.selectAll("lucid_request_targets")
			.where("lucid_request_documents.request_id", "=", props.id)
			.orderBy("lucid_request_targets.id", "asc");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectForRequest",
		});
		return exec.response;
	}
}
