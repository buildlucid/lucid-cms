import z from "zod/v4";
import StaticRepository from "./parents/static-repository.js";
import type { KyselyDB } from "../db-adapter/types.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type { QueryProps } from "./types.js";
import { emailDeliveryStatusSchema } from "../../schemas/email.js";
export default class EmailsRepository extends StaticRepository<"lucid_emails"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_emails");
	}
	tableSchema = z.object({
		id: z.number(),
		from_address: z.string(),
		from_name: z.string(),
		to_address: z.string(),
		subject: z.string(),
		cc: z.string().nullable(),
		bcc: z.string().nullable(),
		template: z.string(),
		data: z.record(z.string(), z.unknown()).nullable(),
		type: z.string(),
		current_status: emailDeliveryStatusSchema,
		attempt_count: z.number(),
		last_attempted_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		transactions: z
			.array(
				z.object({
					delivery_status: emailDeliveryStatusSchema,
					message: z.string().nullable(),
					strategy_identifier: z.string(),
					strategy_data: z.record(z.string(), z.unknown()).nullable(),
					simulate: z.union([
						z.literal(this.dbAdapter.config.defaults.boolean.true),
						z.literal(this.dbAdapter.config.defaults.boolean.false),
					]),
					external_message_id: z.string().nullable(),
					created_at: z.union([z.string(), z.date()]).nullable(),
					updated_at: z.union([z.string(), z.date()]).nullable(),
				}),
			)
			.optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		from_address: this.dbAdapter.getDataType("text"),
		from_name: this.dbAdapter.getDataType("text"),
		to_address: this.dbAdapter.getDataType("text"),
		subject: this.dbAdapter.getDataType("text"),
		cc: this.dbAdapter.getDataType("text"),
		bcc: this.dbAdapter.getDataType("text"),
		template: this.dbAdapter.getDataType("text"),
		data: this.dbAdapter.getDataType("json"),
		type: this.dbAdapter.getDataType("text"),
		current_status: this.dbAdapter.getDataType("text"),
		attempt_count: this.dbAdapter.getDataType("integer"),
		last_attempted_at: this.dbAdapter.getDataType("timestamp"),
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
				currentStatus: "current_status",
			},
			sorts: {
				attemptCount: "attempt_count",
				lastAttemptedAt: "last_attempted_at",
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
				"from_address",
				"from_name",
				"to_address",
				"subject",
				"cc",
				"bcc",
				"template",
				"data",
				"type",
				"current_status",
				"attempt_count",
				"last_attempted_at",
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
								"lucid_email_transactions.external_message_id",
								"lucid_email_transactions.created_at",
								"lucid_email_transactions.updated_at",
							])
							.whereRef(
								"lucid_email_transactions.email_id",
								"=",
								"lucid_emails.id",
							)
							.orderBy("lucid_email_transactions.created_at", "desc"),
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
				"from_address",
				"from_name",
				"to_address",
				"subject",
				"cc",
				"bcc",
				"template",
				"data",
				"type",
				"current_status",
				"attempt_count",
				"last_attempted_at",
				"created_at",
				"updated_at",
				"transactions",
			],
		});
	}
}
