import type { QueryParams } from "../../types/query-params.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder from "../db/query-builder/index.js";
import { emailsTable } from "../db/tables/emails.js";
import type { LucidEmails } from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class EmailsRepository extends StaticRepository<"lucid_emails"> {
	constructor(db: LucidDatabase) {
		super(db, emailsTable);
	}

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
				"priority",
				"headers",
				"data",
				"storage_strategy",
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_email_attachments")
							.select([
								"lucid_email_attachments.type",
								"lucid_email_attachments.url",
								"lucid_email_attachments.filename",
								"lucid_email_attachments.content_type",
								"lucid_email_attachments.disposition",
								"lucid_email_attachments.content_id",
								"lucid_email_attachments.order",
							])
							.whereRef(
								"lucid_email_attachments.email_id",
								"=",
								"lucid_emails.id",
							)
							.orderBy("lucid_email_attachments.order", "asc"),
					)
					.as("attachments"),
				"type",
				"current_status",
				"attempt_count",
				"last_attempted_at",
				"created_at",
				"updated_at",
				this.database.fn
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
				"priority",
				"headers",
				"data",
				"storage_strategy",
				"attachments",
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

	async selectMultipleFilteredFixed<
		K extends keyof Select<LucidEmails>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				select: K[];
				queryParams: Partial<QueryParams>;
				includeSystem?: boolean;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				let mainQuery = this.db.selectFrom("lucid_emails").select(props.select);
				let countQuery = this.db
					.selectFrom("lucid_emails")
					.select((eb) => eb.fn.countAll().as("count"));

				if (props.includeSystem !== true) {
					const nonSystemValue = this.dbAdapter.getDefault("boolean", "false");
					mainQuery = mainQuery.where("is_system", "=", nonSystemValue);
					countQuery = countQuery.where("is_system", "=", nonSystemValue);
				}

				const { main, count } = queryBuilder.main(
					{
						main: mainQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: this.config.queryConfig,
					},
				);

				const [mainResult, countResult] = await Promise.all([
					main.execute() as unknown as Promise<Pick<Select<LucidEmails>, K>[]>,
					count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
				]);

				return [mainResult, countResult] as const;
			},
			{
				method: "selectMultipleFilteredFixed",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
			select: props.select,
		});
	}
}
