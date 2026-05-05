import { sql } from "kysely";
import z from "zod";
import type { GetMultipleQueryParams } from "../../schemas/publish-requests.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../db/query-builder/index.js";
import type {
	KyselyDB,
	LucidDocumentPublishOperationAssignees,
	LucidDocumentPublishOperationEvents,
	LucidDocumentPublishOperations,
	Select,
} from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export interface PublishOperationDetailedQueryResponse
	extends Select<LucidDocumentPublishOperations> {
	requested_by_email?: string | null;
	requested_by_username?: string | null;
	requested_by_first_name?: string | null;
	requested_by_last_name?: string | null;
	decided_by_email?: string | null;
	decided_by_username?: string | null;
	decided_by_first_name?: string | null;
	decided_by_last_name?: string | null;
	assignees: Array<
		Select<LucidDocumentPublishOperationAssignees> & {
			email?: string | null;
			username?: string | null;
			first_name?: string | null;
			last_name?: string | null;
		}
	>;
	events: Array<Select<LucidDocumentPublishOperationEvents>>;
}

export default class DocumentPublishOperationsRepository extends StaticRepository<"lucid_document_publish_operations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document_publish_operations");
	}
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		document_id: z.number(),
		target: z.string(),
		operation_type: z.enum(["request", "direct"]),
		status: z.enum([
			"pending",
			"approved",
			"rejected",
			"cancelled",
			"superseded",
		]),
		source_version_id: z.number(),
		source_content_id: z.string(),
		snapshot_version_id: z.number(),
		requested_by: z.number().nullable(),
		request_comment: z.string().nullable(),
		decided_by: z.number().nullable(),
		decision_comment: z.string().nullable(),
		decided_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]),
		updated_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		target: this.dbAdapter.getDataType("text"),
		operation_type: this.dbAdapter.getDataType("text"),
		status: this.dbAdapter.getDataType("text"),
		source_version_id: this.dbAdapter.getDataType("integer"),
		source_content_id: this.dbAdapter.getDataType("text"),
		snapshot_version_id: this.dbAdapter.getDataType("integer"),
		requested_by: this.dbAdapter.getDataType("integer"),
		request_comment: this.dbAdapter.getDataType("text"),
		decided_by: this.dbAdapter.getDataType("integer"),
		decision_comment: this.dbAdapter.getDataType("text"),
		decided_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = {
		tableKeys: {
			filters: {
				status: "lucid_document_publish_operations.status",
				collectionKey: "lucid_document_publish_operations.collection_key",
				documentId: "lucid_document_publish_operations.document_id",
				target: "lucid_document_publish_operations.target",
			},
			sorts: {
				createdAt: "lucid_document_publish_operations.created_at",
				updatedAt: "lucid_document_publish_operations.updated_at",
			},
		},
	} as const;

	async selectSingleDetailed<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where: QueryBuilderWhere<"lucid_document_publish_operations">;
			}
		>,
	) {
		let baseQuery = this.db.selectFrom("lucid_document_publish_operations");
		baseQuery = queryBuilder.select(baseQuery, props.where);

		const query = baseQuery
			.leftJoin(
				"lucid_users as requester",
				"requester.id",
				"lucid_document_publish_operations.requested_by",
			)
			.leftJoin(
				"lucid_users as decider",
				"decider.id",
				"lucid_document_publish_operations.decided_by",
			)
			.selectAll("lucid_document_publish_operations")
			.select([
				"requester.email as requested_by_email",
				"requester.username as requested_by_username",
				"requester.first_name as requested_by_first_name",
				"requester.last_name as requested_by_last_name",
				"decider.email as decided_by_email",
				"decider.username as decided_by_username",
				"decider.first_name as decided_by_first_name",
				"decider.last_name as decided_by_last_name",
			])
			.select((eb) => [
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_document_publish_operation_assignees")
							.leftJoin(
								"lucid_users",
								"lucid_users.id",
								"lucid_document_publish_operation_assignees.user_id",
							)
							.select([
								"lucid_document_publish_operation_assignees.id",
								"lucid_document_publish_operation_assignees.operation_id",
								"lucid_document_publish_operation_assignees.user_id",
								"lucid_document_publish_operation_assignees.assigned_by",
								"lucid_document_publish_operation_assignees.assigned_at",
								"lucid_users.email",
								"lucid_users.username",
								"lucid_users.first_name",
								"lucid_users.last_name",
							])
							.whereRef(
								"lucid_document_publish_operation_assignees.operation_id",
								"=",
								"lucid_document_publish_operations.id",
							),
					)
					.as("assignees"),
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_document_publish_operation_events")
							.select([
								"lucid_document_publish_operation_events.id",
								"lucid_document_publish_operation_events.operation_id",
								"lucid_document_publish_operation_events.event_type",
								"lucid_document_publish_operation_events.user_id",
								"lucid_document_publish_operation_events.comment",
								"lucid_document_publish_operation_events.metadata",
								"lucid_document_publish_operation_events.created_at",
							])
							.whereRef(
								"lucid_document_publish_operation_events.operation_id",
								"=",
								"lucid_document_publish_operations.id",
							)
							.orderBy(
								"lucid_document_publish_operation_events.created_at",
								"asc",
							),
					)
					.as("events"),
			]);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					PublishOperationDetailedQueryResponse | undefined
				>,
			{
				method: "selectSingleDetailed",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
		});
	}

	async selectMultipleDetailed<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				where?: QueryBuilderWhere<"lucid_document_publish_operations">;
				queryParams: GetMultipleQueryParams;
				assignedTo?: number;
			}
		>,
	) {
		const exec = await this.executeQuery(
			async () => {
				let baseQuery = this.db.selectFrom("lucid_document_publish_operations");
				let countQuery = this.db
					.selectFrom("lucid_document_publish_operations")
					.select(sql`count(*)`.as("count"));

				if (props.where !== undefined && props.where.length > 0) {
					baseQuery = queryBuilder.select(baseQuery, props.where);
					countQuery = queryBuilder.select(countQuery, props.where);
				}

				if (props.assignedTo) {
					const assignedTo = props.assignedTo;
					baseQuery = baseQuery.where(({ exists, selectFrom }) =>
						exists(
							selectFrom("lucid_document_publish_operation_assignees")
								.select(sql.lit(1).as("one"))
								.whereRef(
									"lucid_document_publish_operation_assignees.operation_id",
									"=",
									"lucid_document_publish_operations.id",
								)
								.where(
									"lucid_document_publish_operation_assignees.user_id",
									"=",
									assignedTo,
								),
						),
					);
					countQuery = countQuery.where(({ exists, selectFrom }) =>
						exists(
							selectFrom("lucid_document_publish_operation_assignees")
								.select(sql.lit(1).as("one"))
								.whereRef(
									"lucid_document_publish_operation_assignees.operation_id",
									"=",
									"lucid_document_publish_operations.id",
								)
								.where(
									"lucid_document_publish_operation_assignees.user_id",
									"=",
									assignedTo,
								),
						),
					);
				}

				const queryBuilderRes = queryBuilder.main(
					{
						main: baseQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						meta: this.queryConfig,
					},
				);
				const query = queryBuilderRes.main
					.leftJoin(
						"lucid_users as requester",
						"requester.id",
						"lucid_document_publish_operations.requested_by",
					)
					.leftJoin(
						"lucid_users as decider",
						"decider.id",
						"lucid_document_publish_operations.decided_by",
					)
					.selectAll("lucid_document_publish_operations")
					.select([
						"requester.email as requested_by_email",
						"requester.username as requested_by_username",
						"requester.first_name as requested_by_first_name",
						"requester.last_name as requested_by_last_name",
						"decider.email as decided_by_email",
						"decider.username as decided_by_username",
						"decider.first_name as decided_by_first_name",
						"decider.last_name as decided_by_last_name",
					])
					.select((eb) => [
						this.dbAdapter
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_document_publish_operation_assignees")
									.leftJoin(
										"lucid_users",
										"lucid_users.id",
										"lucid_document_publish_operation_assignees.user_id",
									)
									.select([
										"lucid_document_publish_operation_assignees.id",
										"lucid_document_publish_operation_assignees.operation_id",
										"lucid_document_publish_operation_assignees.user_id",
										"lucid_document_publish_operation_assignees.assigned_by",
										"lucid_document_publish_operation_assignees.assigned_at",
										"lucid_users.email",
										"lucid_users.username",
										"lucid_users.first_name",
										"lucid_users.last_name",
									])
									.whereRef(
										"lucid_document_publish_operation_assignees.operation_id",
										"=",
										"lucid_document_publish_operations.id",
									),
							)
							.as("assignees"),
						this.dbAdapter
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_document_publish_operation_events")
									.select([
										"lucid_document_publish_operation_events.id",
										"lucid_document_publish_operation_events.operation_id",
										"lucid_document_publish_operation_events.event_type",
										"lucid_document_publish_operation_events.user_id",
										"lucid_document_publish_operation_events.comment",
										"lucid_document_publish_operation_events.metadata",
										"lucid_document_publish_operation_events.created_at",
									])
									.whereRef(
										"lucid_document_publish_operation_events.operation_id",
										"=",
										"lucid_document_publish_operations.id",
									)
									.orderBy(
										"lucid_document_publish_operation_events.created_at",
										"asc",
									),
							)
							.as("events"),
					]);
				const orderedQuery =
					props.queryParams.sort !== undefined &&
					props.queryParams.sort.length > 0
						? query
						: query.orderBy(
								"lucid_document_publish_operations.created_at",
								"desc",
							);

				const [data, count] = await Promise.all([
					orderedQuery.execute() as Promise<
						PublishOperationDetailedQueryResponse[]
					>,
					queryBuilderRes.count?.executeTakeFirst() as Promise<
						{ count: string | number } | undefined
					>,
				]);
				return [data, count] as const;
			},
			{
				method: "selectMultipleDetailed",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple-count",
		});
	}
}
