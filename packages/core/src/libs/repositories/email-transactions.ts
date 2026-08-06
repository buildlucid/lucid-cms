import type { LucidDatabase } from "../db/client/index.js";
import { emailTransactionsTable } from "../db/tables/email-transactions.js";
import StaticRepository from "./parents/static-repository.js";

export default class EmailTransactionsRepository extends StaticRepository<"lucid_email_transactions"> {
	constructor(db: LucidDatabase) {
		super(db, emailTransactionsTable);
	}
}
