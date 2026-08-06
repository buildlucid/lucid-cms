import type { LucidDatabase } from "../db/client/index.js";
import { alertRecipientsTable } from "../db/tables/alert-recipients.js";
import StaticRepository from "./parents/static-repository.js";

export default class AlertRecipientsRepository extends StaticRepository<"lucid_alert_recipients"> {
	constructor(db: LucidDatabase) {
		super(db, alertRecipientsTable);
	}
}
