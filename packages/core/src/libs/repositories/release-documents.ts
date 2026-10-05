import type { LucidDatabase } from "../db/client/index.js";
import { releaseDocumentsTable } from "../db/tables/release-documents.js";
import StaticRepository from "./parents/static-repository.js";

export default class ReleaseDocumentsRepository extends StaticRepository<"lucid_release_documents"> {
	constructor(db: LucidDatabase) {
		super(db, releaseDocumentsTable);
	}
	/** Finds the open and closed releases that include a document. Closed releases can be reopened. */
	async selectUnreleasedForDocument(props: {
		collectionKey: string;
		documentId: number;
	}) {
		const query = this.db
			.selectFrom("lucid_release_documents")
			.innerJoin(
				"lucid_releases",
				"lucid_releases.id",
				"lucid_release_documents.release_id",
			)
			.select([
				"lucid_release_documents.id",
				"lucid_release_documents.release_id",
			])
			.where("lucid_release_documents.collection_key", "=", props.collectionKey)
			.where("lucid_release_documents.document_id", "=", props.documentId)
			.where("lucid_releases.status", "!=", "released");

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectUnreleasedForDocument",
		});
		return exec.response;
	}
	/** Finds the open release document whose proposal is this version. */
	async selectOpenForVersion(props: {
		collectionKey: string;
		documentId: number;
		versionId: number;
	}) {
		const query = this.db
			.selectFrom("lucid_release_documents")
			.innerJoin(
				"lucid_releases",
				"lucid_releases.id",
				"lucid_release_documents.release_id",
			)
			.select([
				"lucid_release_documents.id",
				"lucid_release_documents.release_id",
			])
			.where("lucid_release_documents.collection_key", "=", props.collectionKey)
			.where("lucid_release_documents.document_id", "=", props.documentId)
			.where("lucid_release_documents.source_version_id", "=", props.versionId)
			.where("lucid_releases.status", "=", "open");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectOpenForVersion",
		});
		return exec.response;
	}
}
