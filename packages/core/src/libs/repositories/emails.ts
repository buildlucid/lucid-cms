import BaseRepository from "./base-repository.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class EmailsRepo extends BaseRepository<"lucid_emails"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_emails");
	}
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		email_hash: this.dbAdapter.getDataType("char", 64),
		from_address: this.dbAdapter.getDataType("text"),
		from_name: this.dbAdapter.getDataType("text"),
		to_address: this.dbAdapter.getDataType("text"),
		subject: this.dbAdapter.getDataType("text"),
		cc: this.dbAdapter.getDataType("text"),
		bcc: this.dbAdapter.getDataType("text"),
		delivery_status: this.dbAdapter.getDataType("text"),
		template: this.dbAdapter.getDataType("text"),
		data: this.dbAdapter.getDataType("json"),
		type: this.dbAdapter.getDataType("text"),
		sent_count: this.dbAdapter.getDataType("integer"),
		error_count: this.dbAdapter.getDataType("integer"),
		last_error_message: this.dbAdapter.getDataType("text"),
		last_attempt_at: this.dbAdapter.getDataType("timestamp"),
		last_success_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				toAddress: "to_address",
				subject: "subject",
				deliveryStatus: "delivery_status",
				type: "type",
				template: "template",
			},
			sorts: {
				lastAttemptAt: "last_attempt_at",
				lastSuccessAt: "last_success_at",
				createdAt: "created_at",
				sentCount: "sent_count",
				errorCount: "error_count",
			},
		},
		operators: {
			subject: this.dbAdapter.config.fuzzOperator,
			template: this.dbAdapter.config.fuzzOperator,
		},
	} as const;
}
