import type { LucidDatabase } from "../db/client/index.js";
import { emailAttachmentsTable } from "../db/tables/email-attachments.js";
import StaticRepository from "./parents/static-repository.js";

export default class EmailAttachmentsRepository extends StaticRepository<"lucid_email_attachments"> {
	constructor(db: LucidDatabase) {
		super(db, emailAttachmentsTable);
	}
}
