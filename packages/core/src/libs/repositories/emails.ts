import { sql } from "kysely";
import queryBuilder from "../query-builder/index.js";
import BaseRepository from "./base-repository.js";
import type z from "zod";
import type { KyselyDB } from "../db/types.js";
import type { Config } from "../../types/config.js";
import type emailsSchema from "../../schemas/email.js";
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

	// ----------------------------------------
	// selects
	selectMultipleFiltered = async (props: {
		query: z.infer<typeof emailsSchema.getMultiple.query>;
		config: Config;
	}) => {
		const emailsQuery = this.db
			.selectFrom("lucid_emails")
			.select([
				"id",
				"email_hash",
				"from_address",
				"from_name",
				"to_address",
				"subject",
				"cc",
				"bcc",
				"delivery_status",
				"template",
				"type",
				"sent_count",
				"error_count",
				"last_error_message",
				"last_attempt_at",
				"last_success_at",
				"created_at",
			]);

		const emailsCountQuery = this.db
			.selectFrom("lucid_emails")
			.select(sql`count(*)`.as("count"));

		const { main, count } = queryBuilder.main(
			{
				main: emailsQuery,
				count: emailsCountQuery,
			},
			{
				queryParams: {
					filter: props.query.filter,
					sort: props.query.sort,
					include: props.query.include,
					exclude: props.query.exclude,
					page: props.query.page,
					perPage: props.query.perPage,
				},
				meta: {
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
					defaultOperators: {
						subject: props.config.db.config.fuzzOperator,
						template: props.config.db.config.fuzzOperator,
					},
				},
			},
		);

		return Promise.all([
			main.execute(),
			count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
		]);
	};
}
