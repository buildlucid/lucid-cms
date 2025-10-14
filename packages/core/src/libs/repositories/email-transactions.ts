import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db-adapter/types.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import { emailDeliveryStatusSchema } from "../../schemas/email.js";

export default class EmailTransactionsRepository extends StaticRepository<"lucid_email_transactions"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_email_transactions");
	}
	tableSchema = z.object({
		id: z.number(),
		email_id: z.number(),
		delivery_status: emailDeliveryStatusSchema,
		external_message_id: z.string().nullable(),
		message: z.string().nullable(),
		strategy_identifier: z.string(),
		strategy_data: z.record(z.string(), z.unknown()).nullable(),
		simulate: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		email_id: this.dbAdapter.getDataType("integer"),
		delivery_status: this.dbAdapter.getDataType("text"),
		external_message_id: this.dbAdapter.getDataType("text"),
		message: this.dbAdapter.getDataType("text"),
		strategy_identifier: this.dbAdapter.getDataType("text"),
		strategy_data: this.dbAdapter.getDataType("json"),
		simulate: this.dbAdapter.getDataType("boolean"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;
}
