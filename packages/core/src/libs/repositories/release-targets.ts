import type { LucidDatabase } from "../db/client/index.js";
import { releaseTargetsTable } from "../db/tables/release-targets.js";
import StaticRepository from "./parents/static-repository.js";

export default class ReleaseTargetsRepository extends StaticRepository<"lucid_release_targets"> {
	constructor(db: LucidDatabase) {
		super(db, releaseTargetsTable);
	}
	async selectForRelease(props: { id: number }) {
		const query = this.db
			.selectFrom("lucid_release_targets")
			.innerJoin(
				"lucid_release_documents",
				"lucid_release_documents.id",
				"lucid_release_targets.release_document_id",
			)
			.selectAll("lucid_release_targets")
			.where("lucid_release_documents.release_id", "=", props.id)
			.orderBy("lucid_release_targets.id", "asc");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectForRelease",
		});
		return exec.response;
	}
}
