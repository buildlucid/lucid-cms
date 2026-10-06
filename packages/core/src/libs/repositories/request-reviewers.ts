import type { LucidDatabase } from "../db/client/index.js";
import { requestReviewersTable } from "../db/tables/request-reviewers.js";
import StaticRepository from "./parents/static-repository.js";

export default class RequestReviewersRepository extends StaticRepository<"lucid_request_reviewers"> {
	constructor(db: LucidDatabase) {
		super(db, requestReviewersTable);
	}
}
