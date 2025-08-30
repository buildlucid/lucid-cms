import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class EmailsRepository extends StaticRepository<"lucid_emails"> {
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
		template: z.string(),
		data: z.record(z.string(), z.unknown()).nullable(),
		strategy_identifier: z.string(),
		type: z.string(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
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
		template: this.dbAdapter.getDataType("text"),
		data: this.dbAdapter.getDataType("json"),
		strategy_identifier: this.dbAdapter.getDataType("text"),
		type: this.dbAdapter.getDataType("text"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				toAddress: "to_address",
				subject: "subject",
				type: "type",
				template: "template",
			},
			sorts: {
				createdAt: "created_at",
				updatedAt: "updated_at",
			},
		},
		operators: {
			subject: this.dbAdapter.config.fuzzOperator,
			template: this.dbAdapter.config.fuzzOperator,
		},
	} as const;
}
