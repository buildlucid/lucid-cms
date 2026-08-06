import type { LucidDatabase } from "../db/client/index.js";
import { documentPublishOperationEventsTable } from "../db/tables/document-publish-operation-events.js";
import StaticRepository from "./parents/static-repository.js";

export default class DocumentPublishOperationEventsRepository extends StaticRepository<"lucid_document_publish_operation_events"> {
	constructor(db: LucidDatabase) {
		super(db, documentPublishOperationEventsTable);
	}
}
