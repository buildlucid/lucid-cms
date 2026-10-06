import type { LucidDatabase } from "../db/client/index.js";
import { requestApprovalsTable } from "../db/tables/request-approvals.js";
import StaticRepository from "./parents/static-repository.js";

export default class RequestApprovalsRepository extends StaticRepository<"lucid_request_approvals"> {
	constructor(db: LucidDatabase) {
		super(db, requestApprovalsTable);
	}
}
