import type { LucidDatabase } from "../db/client/index.js";
import { documentWorkflowAssigneesTable } from "../db/tables/document-workflow-assignees.js";
import StaticRepository from "./parents/static-repository.js";

export default class DocumentWorkflowAssigneesRepository extends StaticRepository<"lucid_document_workflow_assignees"> {
	constructor(db: LucidDatabase) {
		super(db, documentWorkflowAssigneesTable);
	}
}
