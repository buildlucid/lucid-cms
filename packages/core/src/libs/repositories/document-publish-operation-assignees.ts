import type { LucidDatabase } from "../db/client/index.js";
import { documentPublishOperationAssigneesTable } from "../db/tables/document-publish-operation-assignees.js";
import StaticRepository from "./parents/static-repository.js";

export default class DocumentPublishOperationAssigneesRepository extends StaticRepository<"lucid_document_publish_operation_assignees"> {
	constructor(db: LucidDatabase) {
		super(db, documentPublishOperationAssigneesTable);
	}
}
