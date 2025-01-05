import BaseRepository from "./base-repository.js";
import z from "zod";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class EmailsRepository extends BaseRepository<"lucid_emails"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_emails");
	}
	tableSchema = z.object({
		id: z.number(),
		email_hash: z.string(),
		from_address: z.string(),
		from_name: z.string(),
		to_address: z.string(),
		subject: z.string(),
		cc: z.string().nullable(),
		bcc: z.string().nullable(),
		delivery_status: z.union([
			z.literal("pending"),
			z.literal("delivered"),
			z.literal("failed"),
		]),
		template: z.string(),
		data: z.record(z.string(), z.unknown()).nullable(),
		type: z.string(),
		sent_count: z.number(),
		error_count: z.number(),
		last_error_message: z.string().nullable(),
		last_attempt_at: z.string().nullable(),
		last_success_at: z.string().nullable(),
		created_at: z.string().nullable(),
	});
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
