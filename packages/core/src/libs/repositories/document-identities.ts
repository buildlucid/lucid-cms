import type { LucidDatabase } from "../db/client/index.js";
import { documentIdentitiesTable } from "../db/tables/document-identities.js";
import StaticRepository from "./parents/static-repository.js";

export default class DocumentIdentitiesRepository extends StaticRepository<"lucid_document_identities"> {
	constructor(db: LucidDatabase) {
		super(db, documentIdentitiesTable);
	}
}
