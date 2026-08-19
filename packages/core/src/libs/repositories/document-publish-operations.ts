import { sql } from "kysely";
import type { GetMultipleQueryParams } from "../../schemas/publish-operation-management.js";
import type { LucidDatabase } from "../db/client/index.js";
import queryBuilder, {
	type QueryBuilderWhere,
} from "../db/query-builder/index.js";
import { documentPublishOperationsTable } from "../db/tables/document-publish-operations.js";
import type {
	LucidDocumentPublishOperationAssignees,
	LucidDocumentPublishOperationEvents,
	LucidDocumentPublishOperations,
} from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import type { MediaPosterPropsT } from "../formatters/media.js";
import { activeMediaCropSelect } from "./helpers/media-selects.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export interface PublishOperationDetailedQueryResponse
	extends Select<LucidDocumentPublishOperations> {
	requested_by_email?: string | null;
	requested_by_username?: string | null;
	requested_by_first_name?: string | null;
	requested_by_last_name?: string | null;
	requested_by_profile_picture?: MediaPosterPropsT[];
	decided_by_email?: string | null;
	decided_by_username?: string | null;
	decided_by_first_name?: string | null;
	decided_by_last_name?: string | null;
	decided_by_profile_picture?: MediaPosterPropsT[];
	assignees: Array<
		Select<LucidDocumentPublishOperationAssignees> & {
			email?: string | null;
			username?: string | null;
			first_name?: string | null;
			last_name?: string | null;
			profile_picture?: MediaPosterPropsT[];
		}
	>;
	events: Array<Select<LucidDocumentPublishOperationEvents>>;
}

export type PublishOperationOverviewQueryResponse = {
	total?: string | number;
	pending?: string | number;
	assignedToMe?: string | number;
	requestedByMe?: string | number;
	scheduled?: string | number;
	approved?: string | number;
	rejected?: string | number;
	failed?: string | number;
};

export default class DocumentPublishOperationsRepository extends StaticRepository<"lucid_document_publish_operations"> {
	constructor(db: LucidDatabase) {
		super(db, documentPublishOperationsTable);
	}

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
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media")
							.select([
								"lucid_media.id",
								"lucid_media.key",
								"lucid_media.origin",
								"lucid_media.type",
								"lucid_media.mime_type",
								"lucid_media.file_extension",
								"lucid_media.file_name",
								"lucid_media.file_size",
								"lucid_media.width",
								"lucid_media.height",
								"lucid_media.duration",
								"lucid_media.focal_x",
								"lucid_media.focal_y",
								"lucid_media.blur_hash",
								"lucid_media.average_color",
								"lucid_media.base64",
								"lucid_media.is_dark",
								"lucid_media.is_light",
								activeMediaCropSelect(this.database, "lucid_media.id"),
							])
							.whereRef(
								"lucid_media.id",
								"=",
								"requester.profile_picture_media_id",
							)
							.where(
								"lucid_media.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.as("requested_by_profile_picture"),
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media")
							.select([
								"lucid_media.id",
								"lucid_media.key",
								"lucid_media.origin",
								"lucid_media.type",
								"lucid_media.mime_type",
								"lucid_media.file_extension",
								"lucid_media.file_name",
								"lucid_media.file_size",
								"lucid_media.width",
								"lucid_media.height",
								"lucid_media.duration",
								"lucid_media.focal_x",
								"lucid_media.focal_y",
								"lucid_media.blur_hash",
								"lucid_media.average_color",
								"lucid_media.base64",
								"lucid_media.is_dark",
								"lucid_media.is_light",
								activeMediaCropSelect(this.database, "lucid_media.id"),
							])
							.whereRef(
								"lucid_media.id",
								"=",
								"decider.profile_picture_media_id",
							)
							.where(
								"lucid_media.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.as("decided_by_profile_picture"),
				this.database.fn
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_document_publish_operation_assignees")
							.leftJoin(
								"lucid_users",
								"lucid_users.id",
								"lucid_document_publish_operation_assignees.user_id",
							)
							.select((userEb) => [
								"lucid_document_publish_operation_assignees.id",
								"lucid_document_publish_operation_assignees.operation_id",
								"lucid_document_publish_operation_assignees.user_id",
								"lucid_document_publish_operation_assignees.assigned_by",
								"lucid_document_publish_operation_assignees.assigned_at",
								"lucid_users.email",
								"lucid_users.username",
								"lucid_users.first_name",
								"lucid_users.last_name",
								this.database.fn
									.jsonArrayFrom(
										userEb
											.selectFrom("lucid_media")
											.select([
												"lucid_media.id",
												"lucid_media.key",
												"lucid_media.origin",
												"lucid_media.type",
												"lucid_media.mime_type",
												"lucid_media.file_extension",
												"lucid_media.file_name",
												"lucid_media.file_size",
												"lucid_media.width",
												"lucid_media.height",
												"lucid_media.duration",
												"lucid_media.focal_x",
												"lucid_media.focal_y",
												"lucid_media.blur_hash",
												"lucid_media.average_color",
												"lucid_media.base64",
												"lucid_media.is_dark",
												"lucid_media.is_light",
												activeMediaCropSelect(this.database, "lucid_media.id"),
											])
											.whereRef(
												"lucid_media.id",
												"=",
												"lucid_users.profile_picture_media_id",
											)
											.where(
												"lucid_media.is_deleted",
												"=",
												this.dbAdapter.getDefault("boolean", "false"),
											),
									)
									.as("profile_picture"),
							])
							.whereRef(
								"lucid_document_publish_operation_assignees.operation_id",
								"=",
								"lucid_document_publish_operations.id",
							),
					)
					.as("assignees"),
				this.database.fn
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
				currentUserId: number;
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

				const queryBuilderRes = queryBuilder.main(
					{
						main: baseQuery,
						count: countQuery,
					},
					{
						queryParams: props.queryParams,
						database: this.dbAdapter.config,
						meta: {
							...this.config.queryConfig,
							customFilters: {
								requestedByMe: ({ eb, filter }) => {
									return eb(
										"lucid_document_publish_operations.requested_by",
										filter.value === true ||
											filter.value === "true" ||
											filter.value === "1" ||
											filter.value === 1
											? "="
											: "!=",
										props.currentUserId,
									);
								},
								assignedToMe: ({ eb, filter }) => {
									const assigned = eb.exists(
										eb
											.selectFrom("lucid_document_publish_operation_assignees")
											.select(sql.lit(1).as("one"))
											.whereRef(
												"lucid_document_publish_operation_assignees.operation_id",
												"=",
												"lucid_document_publish_operations.id",
											)
											.where(
												"lucid_document_publish_operation_assignees.user_id",
												"=",
												props.currentUserId,
											),
									);
									return filter.value === true ||
										filter.value === "true" ||
										filter.value === "1" ||
										filter.value === 1
										? assigned
										: eb.not(assigned);
								},
								reviewers: ({ eb, filter }) => {
									const values = Array.isArray(filter.value)
										? filter.value
										: [filter.value];
									const reviewerIds = values
										.map((value) => Number(value))
										.filter(Number.isFinite);

									if (reviewerIds.length === 0) return sql<boolean>`1 = 0`;

									return eb.exists(
										eb
											.selectFrom("lucid_document_publish_operation_assignees")
											.select(sql.lit(1).as("one"))
											.whereRef(
												"lucid_document_publish_operation_assignees.operation_id",
												"=",
												"lucid_document_publish_operations.id",
											)
											.where(
												"lucid_document_publish_operation_assignees.user_id",
												"in",
												reviewerIds,
											),
									);
								},
							},
						},
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
						this.database.fn
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_media")
									.select([
										"lucid_media.id",
										"lucid_media.key",
										"lucid_media.origin",
										"lucid_media.type",
										"lucid_media.mime_type",
										"lucid_media.file_extension",
										"lucid_media.file_name",
										"lucid_media.file_size",
										"lucid_media.width",
										"lucid_media.height",
										"lucid_media.duration",
										"lucid_media.focal_x",
										"lucid_media.focal_y",
										"lucid_media.blur_hash",
										"lucid_media.average_color",
										"lucid_media.base64",
										"lucid_media.is_dark",
										"lucid_media.is_light",
										activeMediaCropSelect(this.database, "lucid_media.id"),
									])
									.whereRef(
										"lucid_media.id",
										"=",
										"requester.profile_picture_media_id",
									)
									.where(
										"lucid_media.is_deleted",
										"=",
										this.dbAdapter.getDefault("boolean", "false"),
									),
							)
							.as("requested_by_profile_picture"),
						this.database.fn
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_media")
									.select([
										"lucid_media.id",
										"lucid_media.key",
										"lucid_media.origin",
										"lucid_media.type",
										"lucid_media.mime_type",
										"lucid_media.file_extension",
										"lucid_media.file_name",
										"lucid_media.file_size",
										"lucid_media.width",
										"lucid_media.height",
										"lucid_media.duration",
										"lucid_media.focal_x",
										"lucid_media.focal_y",
										"lucid_media.blur_hash",
										"lucid_media.average_color",
										"lucid_media.base64",
										"lucid_media.is_dark",
										"lucid_media.is_light",
										activeMediaCropSelect(this.database, "lucid_media.id"),
									])
									.whereRef(
										"lucid_media.id",
										"=",
										"decider.profile_picture_media_id",
									)
									.where(
										"lucid_media.is_deleted",
										"=",
										this.dbAdapter.getDefault("boolean", "false"),
									),
							)
							.as("decided_by_profile_picture"),
						this.database.fn
							.jsonArrayFrom(
								eb
									.selectFrom("lucid_document_publish_operation_assignees")
									.leftJoin(
										"lucid_users",
										"lucid_users.id",
										"lucid_document_publish_operation_assignees.user_id",
									)
									.select((userEb) => [
										"lucid_document_publish_operation_assignees.id",
										"lucid_document_publish_operation_assignees.operation_id",
										"lucid_document_publish_operation_assignees.user_id",
										"lucid_document_publish_operation_assignees.assigned_by",
										"lucid_document_publish_operation_assignees.assigned_at",
										"lucid_users.email",
										"lucid_users.username",
										"lucid_users.first_name",
										"lucid_users.last_name",
										this.database.fn
											.jsonArrayFrom(
												userEb
													.selectFrom("lucid_media")
													.select([
														"lucid_media.id",
														"lucid_media.key",
														"lucid_media.origin",
														"lucid_media.type",
														"lucid_media.mime_type",
														"lucid_media.file_extension",
														"lucid_media.file_name",
														"lucid_media.file_size",
														"lucid_media.width",
														"lucid_media.height",
														"lucid_media.duration",
														"lucid_media.focal_x",
														"lucid_media.focal_y",
														"lucid_media.blur_hash",
														"lucid_media.average_color",
														"lucid_media.base64",
														"lucid_media.is_dark",
														"lucid_media.is_light",
														activeMediaCropSelect(
															this.database,
															"lucid_media.id",
														),
													])
													.whereRef(
														"lucid_media.id",
														"=",
														"lucid_users.profile_picture_media_id",
													)
													.where(
														"lucid_media.is_deleted",
														"=",
														this.dbAdapter.getDefault("boolean", "false"),
													),
											)
											.as("profile_picture"),
									])
									.whereRef(
										"lucid_document_publish_operation_assignees.operation_id",
										"=",
										"lucid_document_publish_operations.id",
									),
							)
							.as("assignees"),
						this.database.fn
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

	async selectOverview(props: {
		userId: number;
		collectionKeys: string[];
		collectionKey?: string;
		target?: string;
	}) {
		const getBaseQuery = () => {
			let query = this.db
				.selectFrom("lucid_document_publish_operations")
				.where(
					"lucid_document_publish_operations.operation_type",
					"=",
					"request",
				)
				.where("lucid_document_publish_operations.status", "!=", "superseded");

			query = query.where(
				"lucid_document_publish_operations.collection_key",
				"in",
				props.collectionKeys,
			);

			if (props.collectionKey) {
				query = query.where(
					"lucid_document_publish_operations.collection_key",
					"=",
					props.collectionKey,
				);
			}
			if (props.target) {
				query = query.where(
					"lucid_document_publish_operations.target",
					"=",
					props.target,
				);
			}

			return query;
		};

		const count = async (
			query: ReturnType<typeof getBaseQuery>,
		): Promise<string | number | undefined> => {
			const row = await query
				.select(sql`count(*)`.as("count"))
				.executeTakeFirst();

			return row?.count as string | number | undefined;
		};

		const exec = await this.executeQuery(
			async (): Promise<PublishOperationOverviewQueryResponse> => {
				const [
					total,
					pending,
					assignedToMe,
					requestedByMe,
					scheduled,
					approved,
					rejected,
					failed,
				] = await Promise.all([
					count(getBaseQuery()),
					count(
						getBaseQuery().where(
							"lucid_document_publish_operations.status",
							"=",
							"pending",
						),
					),
					count(
						getBaseQuery().where(({ exists, selectFrom }) =>
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
										props.userId,
									),
							),
						),
					),
					count(
						getBaseQuery().where(
							"lucid_document_publish_operations.requested_by",
							"=",
							props.userId,
						),
					),
					count(
						getBaseQuery().where(
							"lucid_document_publish_operations.execution_status",
							"=",
							"scheduled",
						),
					),
					count(
						getBaseQuery().where(
							"lucid_document_publish_operations.status",
							"=",
							"approved",
						),
					),
					count(
						getBaseQuery().where(
							"lucid_document_publish_operations.status",
							"=",
							"rejected",
						),
					),
					count(
						getBaseQuery().where(
							"lucid_document_publish_operations.execution_status",
							"=",
							"failed",
						),
					),
				]);

				return {
					total,
					pending,
					assignedToMe,
					requestedByMe,
					scheduled,
					approved,
					rejected,
					failed,
				};
			},
			{
				method: "selectOverview",
			},
		);

		return exec.response;
	}
}
