import type { LucidDatabase } from "../db/client/index.js";
import { releaseReviewersTable } from "../db/tables/release-reviewers.js";
import StaticRepository from "./parents/static-repository.js";

export default class ReleaseReviewersRepository extends StaticRepository<"lucid_release_reviewers"> {
	constructor(db: LucidDatabase) {
		super(db, releaseReviewersTable);
	}
}
