import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";
import type { QueryProps } from "./types.js";
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
		type: z.string(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		transactions: z
			.array(
				z.object({
					delivery_status: z.union([
						z.literal("pending"),
						z.literal("delivered"),
						z.literal("failed"),
					]),
					message: z.string().nullable(),
					strategy_identifier: z.string(),
					strategy_data: z.record(z.string(), z.unknown()).nullable(),
					simulate: z.union([
						z.literal(this.dbAdapter.config.defaults.boolean.true),
						z.literal(this.dbAdapter.config.defaults.boolean.false),
					]),
					created_at: z.union([z.string(), z.date()]).nullable(),
				}),
			)
			.optional(),
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

	// ----------------------------------------
	// queries
	async selectSingleById<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
			}
		>,
	) {
		const query = this.db
			.selectFrom("lucid_emails")
			.select((eb) => [
				"id",
				"email_hash",
				"from_address",
				"from_name",
				"to_address",
				"subject",
				"cc",
				"bcc",
				"template",
				"data",
				"type",
				"created_at",
				"updated_at",
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_email_transactions")
							.select([
								"lucid_email_transactions.delivery_status",
								"lucid_email_transactions.message",
								"lucid_email_transactions.strategy_identifier",
								"lucid_email_transactions.strategy_data",
								"lucid_email_transactions.simulate",
								"lucid_email_transactions.created_at",
							])
							.whereRef(
								"lucid_email_transactions.email_id",
								"=",
								"lucid_emails.id",
							),
					)
					.as("transactions"),
			])
			.where("id", "=", props.id);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleById",
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: [
				"id",
				"email_hash",
				"from_address",
				"from_name",
				"to_address",
				"subject",
				"cc",
				"bcc",
				"template",
				"data",
				"type",
				"created_at",
				"updated_at",
				"transactions",
			],
		});
	}
}
