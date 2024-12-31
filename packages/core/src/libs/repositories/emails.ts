import { sql } from "kysely";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type z from "zod";
import type { LucidEmails, Select, KyselyDB } from "../db/types.js";
import type { Config } from "../../types/config.js";
import type emailsSchema from "../../schemas/email.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class EmailsRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// selects
	selectSingle = async <K extends keyof Select<LucidEmails>>(props: {
		select: K[];
		where: QueryBuilderWhere<"lucid_emails">;
	}) => {
		let query = this.db.selectFrom("lucid_emails").select(props.select);

		query = queryBuilder.select(query, props.where);

		return query.executeTakeFirst() as Promise<
			Pick<Select<LucidEmails>, K> | undefined
		>;
	};
	selectSingleById = async (props: {
		id: number;
	}) => {
		return this.db
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
				"data",
				"type",
				"sent_count",
				"error_count",
				"last_error_message",
				"last_attempt_at",
				"last_success_at",
				"created_at",
			])
			.where("id", "=", props.id)
			.executeTakeFirst();
	};
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
	// ----------------------------------------
	// create
	createSingle = async (props: {
		emailHash: string;
		fromAddress: string;
		fromName: string;
		toAddress: string;
		subject: string;
		template: string;
		cc?: string;
		bcc?: string;
		data: Record<string, unknown> | null;
		type: LucidEmails["type"];
		sentCount: number;
		errorCount: number;
		deliveryStatus: LucidEmails["delivery_status"];
		lastErrorMessage?: string;
		lastSuccessAt?: string;
	}) => {
		return this.db
			.insertInto("lucid_emails")
			.values({
				email_hash: props.emailHash,
				from_address: props.fromAddress,
				from_name: props.fromName,
				to_address: props.toAddress,
				subject: props.subject,
				template: props.template,
				cc: props.cc,
				bcc: props.bcc,
				data: this.dbAdapter.formatInsertValue<string | null>(
					"jsonb",
					props.data,
				),
				type: props.type,
				sent_count: props.sentCount,
				error_count: props.errorCount,
				delivery_status: props.deliveryStatus,
				last_error_message: props.lastErrorMessage,
				last_success_at: props.lastSuccessAt,
			})
			.returningAll()
			.executeTakeFirst();
	};
	// ----------------------------------------
	// update
	updateSingle = async (props: {
		where: QueryBuilderWhere<"lucid_emails">;
		data: {
			deliveryStatus?: LucidEmails["delivery_status"];
			lastErrorMessage?: string;
			lastSuccessAt?: string;
			sentCount?: number;
			errorCount?: number;
			lastAttemptAt?: string;
		};
	}) => {
		let query = this.db
			.updateTable("lucid_emails")
			.set({
				delivery_status: props.data.deliveryStatus,
				last_error_message: props.data.lastErrorMessage,
				last_success_at: props.data.lastSuccessAt,
				sent_count: props.data.sentCount,
				error_count: props.data.errorCount,
				last_attempt_at: props.data.lastAttemptAt,
			})
			.returningAll();

		query = queryBuilder.update(query, props.where);

		return query.executeTakeFirst();
	};
	// ----------------------------------------
	// delete
	deleteSingle = async (props: {
		where: QueryBuilderWhere<"lucid_emails">;
	}) => {
		let query = this.db.deleteFrom("lucid_emails").returning("id");

		query = queryBuilder.delete(query, props.where);

		return query.executeTakeFirst();
	};
}
