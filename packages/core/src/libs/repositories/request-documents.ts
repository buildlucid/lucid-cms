import { sql } from "kysely";
import type { LucidDatabase } from "../db/client/index.js";
import { requestDocumentsTable } from "../db/tables/request-documents.js";
import StaticRepository from "./parents/static-repository.js";

export default class RequestDocumentsRepository extends StaticRepository<"lucid_request_documents"> {
	constructor(db: LucidDatabase) {
		super(db, requestDocumentsTable);
	}
	/**
	 * Finds the open and closed requests that include a document, optionally
	 * only those targeting a version type. Closed requests can be reopened.
	 */
	async selectIncompleteForDocument(props: {
		collectionKey: string;
		documentId: number;
		target?: string;
	}) {
		let query = this.db
			.selectFrom("lucid_request_documents")
			.innerJoin(
				"lucid_requests",
				"lucid_requests.id",
				"lucid_request_documents.request_id",
			)
			.select([
				"lucid_request_documents.id",
				"lucid_request_documents.request_id",
			])
			.where("lucid_request_documents.collection_key", "=", props.collectionKey)
			.where("lucid_request_documents.document_id", "=", props.documentId)
			.where("lucid_requests.status", "!=", "completed");
		if (props.target !== undefined) {
			const target = props.target;
			query = query.where((eb) =>
				eb.exists(
					eb
						.selectFrom("lucid_request_targets")
						.select(sql.lit(1).as("one"))
						.whereRef(
							"lucid_request_targets.request_document_id",
							"=",
							"lucid_request_documents.id",
						)
						.where("lucid_request_targets.target", "=", target),
				),
			);
		}

		const exec = await this.executeQuery(() => query.execute(), {
			method: "selectIncompleteForDocument",
		});
		return exec.response;
	}
	/** Finds the open request document whose proposal is this version. */
	async selectOpenForVersion(props: {
		collectionKey: string;
		documentId: number;
		versionId: number;
	}) {
		const query = this.db
			.selectFrom("lucid_request_documents")
			.innerJoin(
				"lucid_requests",
				"lucid_requests.id",
				"lucid_request_documents.request_id",
			)
			.select([
				"lucid_request_documents.id",
				"lucid_request_documents.request_id",
			])
			.where("lucid_request_documents.collection_key", "=", props.collectionKey)
			.where("lucid_request_documents.document_id", "=", props.documentId)
			.where("lucid_request_documents.source_version_id", "=", props.versionId)
			.where("lucid_requests.status", "=", "open");

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectOpenForVersion",
		});
		return exec.response;
	}
}
