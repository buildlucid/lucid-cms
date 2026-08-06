import type { LucidDatabase } from "../db/client/index.js";
import { alertsTable } from "../db/tables/alerts.js";
import StaticRepository from "./parents/static-repository.js";

export default class AlertsRepository extends StaticRepository<"lucid_alerts"> {
	constructor(db: LucidDatabase) {
		super(db, alertsTable);
	}
}
