import type { ComparisonOperatorExpression } from "kysely";
import { type SelectQueryBuilder, sql } from "kysely";
import z from "zod";
import constants from "../../constants/constants.js";
import { versionTypesSchema } from "../../schemas/document-versions.js";
import type {
	ClientGetSingleQueryParams,
	GetMultipleQueryParams,
} from "../../schemas/documents.js";
import type { QueryParamFilters } from "../../types/query-params.js";
import type {
	Config,
	LucidBricksTable,
	LucidBrickTableName,
	LucidVersionTable,
} from "../../types.js";
import type { BrickFilters } from "../../utils/helpers/group-document-filters.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type DatabaseAdapter from "../db/adapter-base.js";
import queryBuilder from "../db/query-builder/index.js";
import type {
	DocumentVersionType,
	Insert,
	KyselyDB,
	LucidDocumentTable,
	LucidDocumentTableName,
	LucidVersionTableName,
	Select,
} from "../db/types.js";
import type { MediaPosterPropsT } from "../formatters/media.js";
import type { DocumentWorkflowDetailedQueryResponse } from "./document-workflows.js";
import DynamicRepository from "./parents/dynamic-repository.js";
import type { DynamicConfig, QueryProps } from "./types.js";

export interface DocumentQueryResponse extends Select<LucidDocumentTable> {
	// Created by user join
	cb_user_id?: number | null;
	cb_user_email?: string | null;
	cb_user_first_name?: string | null;
	cb_user_last_name?: string | null;
	cb_user_username?: string | null;
	cb_user_profile_picture?: MediaPosterPropsT[];
	// Updated by user join
	ub_user_id?: number | null;
	ub_user_email?: string | null;
	ub_user_first_name?: string | null;
	ub_user_last_name?: string | null;
	ub_user_username?: string | null;
	ub_user_profile_picture?: MediaPosterPropsT[];
	// Target Version
	version_id?: number | null;
	version_type?: DocumentVersionType | null;
	version_promoted_from?: number | null;
	version_created_at?: Date | string | null;
	version_created_by?: number | null;
	workflow_id?: number | null;
	workflow_stage_key?: string | null;
	workflow_created_by?: number | null;
	workflow_created_at?: Date | string | null;
	workflow_updated_by?: number | null;
	workflow_updated_at?: Date | string | null;
	workflow_assignees?: DocumentWorkflowDetailedQueryResponse["assignees"];
	versions: Select<LucidVersionTable>[];
	[key: LucidBrickTableName]: Select<LucidBricksTable>[];
}

export default class DocumentsRepository extends DynamicRepository<LucidDocumentTableName> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document__collection-key");
	}
	tableSchema = z.object({
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.union([z.string(), z.date()]).optional(),
		deleted_by: z.number().nullable(),

		id: z.number(),
		collection_key: z.string(),
		collection_migration_id: z.number(),
		created_by: z.number().nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
		updated_by: z.number().nullable(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		versions: z.array(
			z.object({
				id: z.number(),
				type: versionTypesSchema,
				created_by: z.number().nullable(),
				created_at: z.union([z.string(), z.date()]),
				updated_by: z.number().nullable(),
				updated_at: z.union([z.string(), z.date()]).nullable(),
			}),
		),
		cb_user_id: z.number().nullable(),
		cb_user_email: z.email().nullable(),
		cb_user_first_name: z.string().nullable(),
		cb_user_last_name: z.string().nullable(),
		cb_user_username: z.string().nullable(),
		cb_user_profile_picture: z.array(z.any()).optional(),
		ub_user_id: z.number().nullable(),
		ub_user_email: z.email().nullable(),
		ub_user_first_name: z.string().nullable(),
		ub_user_last_name: z.string().nullable(),
		ub_user_username: z.string().nullable(),
		ub_user_profile_picture: z.array(z.any()).optional(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		collection_migration_id: this.dbAdapter.getDataType("integer"),
		is_deleted: this.dbAdapter.getDataType("boolean"),
		is_deleted_at: this.dbAdapter.getDataType("timestamp"),
		deleted_by: this.dbAdapter.getDataType("integer"),
		created_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
		updated_by: this.dbAdapter.getDataType("integer"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	// ----------------------------------------
	// queries
	async upsertSingle<
		K extends keyof Select<LucidDocumentTable>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<LucidDocumentTable>>;
				returning?: K[];
				returnAll?: true;
			}
		>,
		dynamicConfig: DynamicConfig<LucidDocumentTableName>,
	) {
		const query = this.db
			.insertInto(dynamicConfig.tableName)
			.values(
				this.formatData(props.data, {
					type: "insert",
					dynamicColumns: dynamicConfig.columns,
				}),
			)
			.onConflict((oc) =>
				oc.column("id").doUpdateSet((eb) => ({
					collection_migration_id: eb.ref("excluded.collection_migration_id"),
					is_deleted: eb.ref("excluded.is_deleted"),
					is_deleted_at: eb.ref("excluded.is_deleted_at"),
					deleted_by: eb.ref("excluded.deleted_by"),
					updated_at: eb.ref("excluded.updated_at"),
				})),
			)
			.$if(
				props.returnAll !== true &&
					props.returning !== undefined &&
					props.returning.length > 0,
				(qb) => qb.returning(props.returning as K[]),
			)
			.$if(props.returnAll ?? false, (qb) => qb.returningAll());

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidDocumentTable>, K> | undefined
				>,
			{
				method: "upsertSingle",
				tableName: dynamicConfig.tableName,
			},
		);

		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
	async upsertMultiple<
		K extends keyof Select<LucidDocumentTable>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<LucidDocumentTable>>[];
				returning?: K[];
				returnAll?: true;
			}
		>,
		dynamicConfig: DynamicConfig<LucidDocumentTableName>,
	) {
		const query = this.db
			.insertInto(dynamicConfig.tableName)
			.values(
				props.data.map((d) =>
					this.formatData(d, {
						type: "insert",
						dynamicColumns: dynamicConfig.columns,
					}),
				),
			)
			.onConflict((oc) =>
				oc.column("id").doUpdateSet((eb) => ({
					collection_migration_id: eb.ref("excluded.collection_migration_id"),
					is_deleted: eb.ref("excluded.is_deleted"),
					is_deleted_at: eb.ref("excluded.is_deleted_at"),
					deleted_by: eb.ref("excluded.deleted_by"),
					updated_at: eb.ref("excluded.updated_at"),
				})),
			)
			.$if(
				props.returnAll !== true &&
					props.returning !== undefined &&
					props.returning.length > 0,
				(qb) => qb.returning(props.returning as K[]),
			)
			.$if(props.returnAll ?? false, (qb) => qb.returningAll());

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidDocumentTable>, K> | undefined
				>,
			{
				method: "upsertMultiple",
				tableName: dynamicConfig.tableName,
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.returning as string[],
			selectAll: props.returnAll,
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
	async selectSingleById<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				id: number;
				status?: DocumentVersionType;
				versionId?: number;
				tables: {
					versions: LucidVersionTableName;
				};
			}
		>,
		dynamicConfig: DynamicConfig<LucidDocumentTableName>,
	) {
		const query = this.db
			.selectFrom(dynamicConfig.tableName)
			.select([
				`${dynamicConfig.tableName}.id`,
				`${dynamicConfig.tableName}.collection_key`,
				`${dynamicConfig.tableName}.created_by`,
				`${dynamicConfig.tableName}.created_at`,
				`${dynamicConfig.tableName}.updated_at`,
				`${dynamicConfig.tableName}.updated_by`,
				`${dynamicConfig.tableName}.is_deleted`,
			])
			.select([
				(eb) =>
					this.dbAdapter
						.jsonArrayFrom(
							eb
								.selectFrom(props.tables.versions)
								// @ts-expect-error
								.select([
									`${props.tables.versions}.id`,
									`${props.tables.versions}.type`,
									`${props.tables.versions}.promoted_from`,
									`${props.tables.versions}.content_id`,
									`${props.tables.versions}.created_at`,
									`${props.tables.versions}.created_by`,
									`${props.tables.versions}.updated_at`,
									`${props.tables.versions}.updated_by`,
								])
								.whereRef(
									// @ts-expect-error
									`${props.tables.versions}.document_id`,
									"=",
									`${dynamicConfig.tableName}.id`,
								)
								.where((eb) =>
									// @ts-expect-error
									eb(`${props.tables.versions}.type`, "!=", "revision"),
								)
								.where((eb) =>
									eb(
										// @ts-expect-error
										`${props.tables.versions}.type`,
										"!=",
										constants.collectionBuilder.publishing.snapshotVersionType,
									),
								),
						)
						.as("versions"),
			])
			.$if(props.status !== undefined, (qb) =>
				qb
					.leftJoin(props.tables.versions, (join) =>
						join
							.onRef(
								// @ts-expect-error
								`${props.tables.versions}.document_id`,
								"=",
								`${dynamicConfig.tableName}.id`,
							)
							// @ts-expect-error
							.on(`${props.tables.versions}.type`, "=", props.status),
					)
					// @ts-expect-error
					.select([
						`${props.tables.versions}.id as version_id`,
						`${props.tables.versions}.type as version_type`,
						`${props.tables.versions}.created_at as version_created_at`,
						`${props.tables.versions}.created_by as version_created_by`,
						`${props.tables.versions}.updated_at as version_updated_at`,
						`${props.tables.versions}.updated_by as version_updated_by`,
					]),
			)
			.$if(props.versionId !== undefined, (qb) =>
				qb
					.leftJoin(props.tables.versions, (join) =>
						join
							.onRef(
								// @ts-expect-error
								`${props.tables.versions}.document_id`,
								"=",
								`${dynamicConfig.tableName}.id`,
							)
							.on(
								`${props.tables.versions}.id`,
								"=",
								props.versionId as number,
							),
					)
					// @ts-expect-error
					.select([
						`${props.tables.versions}.id as version_id`,
						`${props.tables.versions}.type as version_type`,
						`${props.tables.versions}.created_at as version_created_at`,
						`${props.tables.versions}.created_by as version_created_by`,
						`${props.tables.versions}.updated_at as version_updated_at`,
						`${props.tables.versions}.updated_by as version_updated_by`,
					]),
			)
			.leftJoin(
				"lucid_users as cb_user",
				"cb_user.id",
				`${dynamicConfig.tableName}.created_by`,
			)
			.leftJoin(
				"lucid_users as ub_user",
				"ub_user.id",
				`${dynamicConfig.tableName}.updated_by`,
			)
			.select([
				// created by
				"cb_user.id as cb_user_id",
				"cb_user.email as cb_user_email",
				"cb_user.first_name as cb_user_first_name",
				"cb_user.last_name as cb_user_last_name",
				"cb_user.username as cb_user_username",
				// updated by
				"ub_user.id as ub_user_id",
				"ub_user.email as ub_user_email",
				"ub_user.first_name as ub_user_first_name",
				"ub_user.last_name as ub_user_last_name",
				"ub_user.username as ub_user_username",
			])
			.select((eb) => [
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media")
							.select([
								"lucid_media.id",
								"lucid_media.key",
								"lucid_media.type",
								"lucid_media.mime_type",
								"lucid_media.file_extension",
								"lucid_media.file_name",
								"lucid_media.file_size",
								"lucid_media.width",
								"lucid_media.height",
								"lucid_media.focal_x",
								"lucid_media.focal_y",
								"lucid_media.blur_hash",
								"lucid_media.average_color",
								"lucid_media.base64",
								"lucid_media.is_dark",
								"lucid_media.is_light",
							])
							.whereRef(
								"lucid_media.id",
								"=",
								"cb_user.profile_picture_media_id",
							)
							.where(
								"lucid_media.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.as("cb_user_profile_picture"),
				this.dbAdapter
					.jsonArrayFrom(
						eb
							.selectFrom("lucid_media")
							.select([
								"lucid_media.id",
								"lucid_media.key",
								"lucid_media.type",
								"lucid_media.mime_type",
								"lucid_media.file_extension",
								"lucid_media.file_name",
								"lucid_media.file_size",
								"lucid_media.width",
								"lucid_media.height",
								"lucid_media.focal_x",
								"lucid_media.focal_y",
								"lucid_media.blur_hash",
								"lucid_media.average_color",
								"lucid_media.base64",
								"lucid_media.is_dark",
								"lucid_media.is_light",
							])
							.whereRef(
								"lucid_media.id",
								"=",
								"ub_user.profile_picture_media_id",
							)
							.where(
								"lucid_media.is_deleted",
								"=",
								this.dbAdapter.getDefault("boolean", "false"),
							),
					)
					.as("ub_user_profile_picture"),
			])
			.where(`${dynamicConfig.tableName}.id`, "=", props.id);

		const exec = await this.executeQuery(
			() =>
				query.executeTakeFirst() as unknown as Promise<DocumentQueryResponse>,
			{
				method: "selectSingleById",
				tableName: dynamicConfig.tableName,
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
	async selectMultipleFiltered(
		props: {
			status: DocumentVersionType;
			/** The status used to determine which version of the document custom field relations to fetch */
			relationVersionType: Exclude<DocumentVersionType, "revision">;
			documentFilters: QueryParamFilters;
			brickFilters: BrickFilters[];
			query: GetMultipleQueryParams;
			collection: CollectionBuilder;
			documentFieldsTableSchema:
				| CollectionSchemaTable<LucidBrickTableName>
				| undefined;
			documentFieldRelationTableSchemas?: CollectionSchemaTable<LucidBrickTableName>[];
			config: Config;
			includeWorkflow: boolean;
			workflowAssigneeFilterValues?: Array<string | number>;
			tables: {
				versions: LucidVersionTableName;
				documentFields: LucidBrickTableName;
			};
		},
		dynamicConfig: DynamicConfig<LucidDocumentTableName>,
	) {
		const queryFn = async () => {
			let query = this.db
				.selectFrom(dynamicConfig.tableName)
				.leftJoin(
					props.tables.versions,
					// @ts-expect-error
					`${props.tables.versions}.document_id`,
					`${dynamicConfig.tableName}.id`,
				)
				.select([
					`${dynamicConfig.tableName}.id`,
					`${dynamicConfig.tableName}.collection_key`,
					`${dynamicConfig.tableName}.created_by`,
					`${dynamicConfig.tableName}.created_at`,
					`${dynamicConfig.tableName}.updated_at`,
					`${dynamicConfig.tableName}.updated_by`,
					`${dynamicConfig.tableName}.is_deleted`,
				])
				.select([
					(eb) =>
						this.dbAdapter
							.jsonArrayFrom(
								eb
									.selectFrom(props.tables.versions)
									// @ts-expect-error
									.select(() => [
										`${props.tables.versions}.id`,
										`${props.tables.versions}.type`,
										`${props.tables.versions}.promoted_from`,
										`${props.tables.versions}.content_id`,
										`${props.tables.versions}.created_at`,
										`${props.tables.versions}.created_by`,
										`${props.tables.versions}.updated_at`,
										`${props.tables.versions}.updated_by`,
									])
									.whereRef(
										// @ts-expect-error
										`${props.tables.versions}.document_id`,
										"=",
										`${dynamicConfig.tableName}.id`,
									)
									.where((eb) =>
										// @ts-expect-error
										eb(`${props.tables.versions}.type`, "!=", "revision"),
									)
									.where((eb) =>
										eb(
											// @ts-expect-error
											`${props.tables.versions}.type`,
											"!=",
											constants.collectionBuilder.publishing
												.snapshotVersionType,
										),
									),
							)
							.as("versions"),
					this.dbAdapter
						.jsonArrayFrom(
							this.db
								.selectFrom(props.tables.documentFields)
								.innerJoin(
									props.tables.versions,
									`${props.tables.versions}.id`,
									`${props.tables.documentFields}.document_version_id`,
								)
								.where(
									`${props.tables.versions}.document_id`,
									"=",
									// @ts-expect-error
									sql.ref(`${dynamicConfig.tableName}.id`),
								)
								.where(`${props.tables.versions}.type`, "=", props.status)
								.select(
									props.documentFieldsTableSchema?.columns.map(
										(c) => `${props.tables.documentFields}.${c.name}`,
									) || [],
								),
						)
						.as(props.tables.documentFields),
					...(props.documentFieldRelationTableSchemas ?? []).map((schema) =>
						this.dbAdapter
							.jsonArrayFrom(
								this.db
									.selectFrom(schema.name)
									.innerJoin(
										props.tables.versions,
										`${props.tables.versions}.id`,
										`${schema.name}.document_version_id`,
									)
									.where(
										`${props.tables.versions}.document_id`,
										"=",
										// @ts-expect-error
										sql.ref(`${dynamicConfig.tableName}.id`),
									)
									.where(`${props.tables.versions}.type`, "=", props.status)
									.select(
										schema.columns.map((c) => `${schema.name}.${c.name}`),
									),
							)
							.as(schema.name),
					),
				])
				// @ts-expect-error
				.select([
					`${props.tables.versions}.id as version_id`,
					`${props.tables.versions}.type as version_type`,
				])
				.$if(props.includeWorkflow, (qb) =>
					qb
						.leftJoin("lucid_document_workflows", (join) =>
							join
								.on(
									"lucid_document_workflows.collection_key",
									"=",
									props.collection.getData.key,
								)
								.onRef(
									"lucid_document_workflows.document_id",
									"=",
									`${dynamicConfig.tableName}.id`,
								),
						)
						.select([
							"lucid_document_workflows.id as workflow_id",
							"lucid_document_workflows.stage_key as workflow_stage_key",
							"lucid_document_workflows.created_by as workflow_created_by",
							"lucid_document_workflows.created_at as workflow_created_at",
							"lucid_document_workflows.updated_by as workflow_updated_by",
							"lucid_document_workflows.updated_at as workflow_updated_at",
						])
						.select((eb) => [
							this.dbAdapter
								.jsonArrayFrom(
									eb
										.selectFrom("lucid_document_workflow_assignees")
										.leftJoin(
											"lucid_users",
											"lucid_users.id",
											"lucid_document_workflow_assignees.user_id",
										)
										.select((userEb) => [
											"lucid_document_workflow_assignees.id",
											"lucid_document_workflow_assignees.workflow_id",
											"lucid_document_workflow_assignees.user_id",
											"lucid_document_workflow_assignees.assigned_by",
											"lucid_document_workflow_assignees.assigned_at",
											"lucid_users.email",
											"lucid_users.username",
											"lucid_users.first_name",
											"lucid_users.last_name",
											this.dbAdapter
												.jsonArrayFrom(
													userEb
														.selectFrom("lucid_media")
														.select((mediaEb) => [
															"lucid_media.id",
															"lucid_media.key",
															"lucid_media.type",
															"lucid_media.mime_type",
															"lucid_media.file_extension",
															"lucid_media.file_name",
															"lucid_media.file_size",
															"lucid_media.width",
															"lucid_media.height",
															"lucid_media.focal_x",
															"lucid_media.focal_y",
															"lucid_media.blur_hash",
															"lucid_media.average_color",
															"lucid_media.base64",
															"lucid_media.is_dark",
															"lucid_media.is_light",
															this.dbAdapter
																.jsonArrayFrom(
																	mediaEb
																		.selectFrom("lucid_media_translations")
																		.select([
																			"lucid_media_translations.title",
																			"lucid_media_translations.alt",
																			"lucid_media_translations.description",
																			"lucid_media_translations.summary",
																			"lucid_media_translations.locale_code",
																		])
																		.whereRef(
																			"lucid_media_translations.media_id",
																			"=",
																			"lucid_media.id",
																		),
																)
																.as("translations"),
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
											"lucid_document_workflow_assignees.workflow_id",
											"=",
											"lucid_document_workflows.id",
										)
										.orderBy(
											"lucid_document_workflow_assignees.assigned_at",
											"asc",
										),
								)
								.as("workflow_assignees"),
						]),
				)
				.leftJoin(
					"lucid_users as cb_user",
					"cb_user.id",
					`${dynamicConfig.tableName}.created_by`,
				)
				.leftJoin(
					"lucid_users as ub_user",
					"ub_user.id",
					`${dynamicConfig.tableName}.updated_by`,
				)
				.select([
					"cb_user.id as cb_user_id",
					"cb_user.email as cb_user_email",
					"cb_user.first_name as cb_user_first_name",
					"cb_user.last_name as cb_user_last_name",
					"cb_user.username as cb_user_username",
					"ub_user.id as ub_user_id",
					"ub_user.email as ub_user_email",
					"ub_user.first_name as ub_user_first_name",
					"ub_user.last_name as ub_user_last_name",
					"ub_user.username as ub_user_username",
				])
				.select((eb) => [
					this.dbAdapter
						.jsonArrayFrom(
							eb
								.selectFrom("lucid_media")
								.select([
									"lucid_media.id",
									"lucid_media.key",
									"lucid_media.type",
									"lucid_media.mime_type",
									"lucid_media.file_extension",
									"lucid_media.file_name",
									"lucid_media.file_size",
									"lucid_media.width",
									"lucid_media.height",
									"lucid_media.focal_x",
									"lucid_media.focal_y",
									"lucid_media.blur_hash",
									"lucid_media.average_color",
									"lucid_media.base64",
									"lucid_media.is_dark",
									"lucid_media.is_light",
								])
								.whereRef(
									"lucid_media.id",
									"=",
									"cb_user.profile_picture_media_id",
								)
								.where(
									"lucid_media.is_deleted",
									"=",
									this.dbAdapter.getDefault("boolean", "false"),
								),
						)
						.as("cb_user_profile_picture"),
					this.dbAdapter
						.jsonArrayFrom(
							eb
								.selectFrom("lucid_media")
								.select([
									"lucid_media.id",
									"lucid_media.key",
									"lucid_media.type",
									"lucid_media.mime_type",
									"lucid_media.file_extension",
									"lucid_media.file_name",
									"lucid_media.file_size",
									"lucid_media.width",
									"lucid_media.height",
									"lucid_media.focal_x",
									"lucid_media.focal_y",
									"lucid_media.blur_hash",
									"lucid_media.average_color",
									"lucid_media.base64",
									"lucid_media.is_dark",
									"lucid_media.is_light",
								])
								.whereRef(
									"lucid_media.id",
									"=",
									"ub_user.profile_picture_media_id",
								)
								.where(
									"lucid_media.is_deleted",
									"=",
									this.dbAdapter.getDefault("boolean", "false"),
								),
						)
						.as("ub_user_profile_picture"),
				])
				// @ts-expect-error
				.where(`${props.tables.versions}.type`, "=", props.status);

			let queryCount = this.db
				.selectFrom(dynamicConfig.tableName)
				.leftJoin(
					props.tables.versions,
					// @ts-expect-error
					`${props.tables.versions}.document_id`,
					`${dynamicConfig.tableName}.id`,
				)
				.leftJoin(
					"lucid_users as cb_user",
					"cb_user.id",
					`${dynamicConfig.tableName}.created_by`,
				)
				.leftJoin(
					"lucid_users as ub_user",
					"ub_user.id",
					`${dynamicConfig.tableName}.updated_by`,
				)
				.select(() =>
					sql`count(distinct ${sql.ref(`${dynamicConfig.tableName}.id`)})`.as(
						"count",
					),
				)
				.$if(props.includeWorkflow, (qb) =>
					qb.leftJoin("lucid_document_workflows", (join) =>
						join
							.on(
								"lucid_document_workflows.collection_key",
								"=",
								props.collection.getData.key,
							)
							.onRef(
								"lucid_document_workflows.document_id",
								"=",
								`${dynamicConfig.tableName}.id`,
							),
					),
				)
				// @ts-expect-error
				.where(`${props.tables.versions}.type`, "=", props.status);

			if (
				props.includeWorkflow &&
				props.workflowAssigneeFilterValues !== undefined
			) {
				const assigneeFilter =
					props.workflowAssigneeFilterValues.length > 0
						? sql<boolean>`exists (
								select 1
								from lucid_document_workflow_assignees
								where lucid_document_workflow_assignees.workflow_id = lucid_document_workflows.id
								and lucid_document_workflow_assignees.user_id in (${sql.join(props.workflowAssigneeFilterValues.map((id) => sql`${id}`))})
							)`
						: sql<boolean>`1 = 0`;
				query = query.where(assigneeFilter);
				queryCount = queryCount.where(assigneeFilter);
			}

			query = this.applyBrickFiltersToQuery(
				query,
				props.brickFilters,
				dynamicConfig.tableName,
				props.tables.versions,
			);
			queryCount = this.applyBrickFiltersToQuery(
				queryCount,
				props.brickFilters,
				dynamicConfig.tableName,
				props.tables.versions,
			);

			const { main, count } = queryBuilder.main(
				{
					main: query,
					count: queryCount,
				},
				{
					queryParams: {
						filter: props.documentFilters,
						sort: props.query.sort,
						page: props.query.page,
						perPage: props.query.perPage,
					},
					meta: {
						tableKeys: {
							filters: {
								id: `${dynamicConfig.tableName}.id`,
								collectionKey: `${dynamicConfig.tableName}.collection_key`,
								createdBy: `${dynamicConfig.tableName}.created_by`,
								updatedBy: `${dynamicConfig.tableName}.updated_by`,
								createdAt: `${dynamicConfig.tableName}.created_at`,
								updatedAt: `${dynamicConfig.tableName}.updated_at`,
								isDeleted: `${dynamicConfig.tableName}.is_deleted`,
								deletedBy: `${dynamicConfig.tableName}.deleted_by`,
								...(props.includeWorkflow
									? {
											workflowStage: sql.ref(
												"lucid_document_workflows.stage_key",
											),
										}
									: {}),
							},
							sorts: {
								createdAt: `${dynamicConfig.tableName}.created_at`,
								updatedAt: `${dynamicConfig.tableName}.updated_at`,
							},
						},
					},
				},
			);

			const [mainResult, countResult] = await Promise.all([
				main.execute() as unknown as Promise<DocumentQueryResponse[]>,
				count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
			]);

			return [mainResult, countResult] as const;
		};

		const exec = await this.executeQuery(queryFn, {
			method: "selectMultipleFiltered",
			tableName: dynamicConfig.tableName,
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			mode: "multiple-count",
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
	async selectSingleFiltered(
		props: {
			status: DocumentVersionType;
			/** The status used to determine which version of the document custom field relations to fetch */
			relationVersionType: Exclude<DocumentVersionType, "revision">;
			documentFilters: QueryParamFilters;
			brickFilters: BrickFilters[];
			query: ClientGetSingleQueryParams;
			collection: CollectionBuilder;
			config: Config;
			tables: {
				versions: LucidVersionTableName;
			};
		},
		dynamicConfig: DynamicConfig<LucidDocumentTableName>,
	) {
		const queryFn = async () => {
			let query = this.db
				.selectFrom(dynamicConfig.tableName)
				.leftJoin(
					props.tables.versions,
					// @ts-expect-error
					`${props.tables.versions}.document_id`,
					`${dynamicConfig.tableName}.id`,
				)
				.select([
					`${dynamicConfig.tableName}.id`,
					`${dynamicConfig.tableName}.collection_key`,
					`${dynamicConfig.tableName}.created_by`,
					`${dynamicConfig.tableName}.created_at`,
					`${dynamicConfig.tableName}.updated_at`,
					`${dynamicConfig.tableName}.updated_by`,
					`${dynamicConfig.tableName}.is_deleted`,
				])
				.select([
					(eb) =>
						this.dbAdapter
							.jsonArrayFrom(
								eb
									.selectFrom(props.tables.versions)
									// @ts-expect-error
									.select(() => [
										`${props.tables.versions}.id`,
										`${props.tables.versions}.type`,
										`${props.tables.versions}.promoted_from`,
										`${props.tables.versions}.content_id`,
										`${props.tables.versions}.created_at`,
										`${props.tables.versions}.created_by`,
										`${props.tables.versions}.updated_at`,
										`${props.tables.versions}.updated_by`,
									])
									.whereRef(
										// @ts-expect-error
										`${props.tables.versions}.document_id`,
										"=",
										`${dynamicConfig.tableName}.id`,
									)
									.where((eb) =>
										// @ts-expect-error
										eb(`${props.tables.versions}.type`, "!=", "revision"),
									)
									.where((eb) =>
										eb(
											// @ts-expect-error
											`${props.tables.versions}.type`,
											"!=",
											constants.collectionBuilder.publishing
												.snapshotVersionType,
										),
									),
							)
							.as("versions"),
				])
				// @ts-expect-error
				.select([
					`${props.tables.versions}.id as version_id`,
					`${props.tables.versions}.type as version_type`,
				])
				.leftJoin(
					"lucid_users as cb_user",
					"cb_user.id",
					`${dynamicConfig.tableName}.created_by`,
				)
				.leftJoin(
					"lucid_users as ub_user",
					"ub_user.id",
					`${dynamicConfig.tableName}.updated_by`,
				)
				.select([
					"cb_user.id as cb_user_id",
					"cb_user.email as cb_user_email",
					"cb_user.first_name as cb_user_first_name",
					"cb_user.last_name as cb_user_last_name",
					"cb_user.username as cb_user_username",
					"ub_user.id as ub_user_id",
					"ub_user.email as ub_user_email",
					"ub_user.first_name as ub_user_first_name",
					"ub_user.last_name as ub_user_last_name",
					"ub_user.username as ub_user_username",
				])
				.select((eb) => [
					this.dbAdapter
						.jsonArrayFrom(
							eb
								.selectFrom("lucid_media")
								.select([
									"lucid_media.id",
									"lucid_media.key",
									"lucid_media.type",
									"lucid_media.mime_type",
									"lucid_media.file_extension",
									"lucid_media.file_name",
									"lucid_media.file_size",
									"lucid_media.width",
									"lucid_media.height",
									"lucid_media.focal_x",
									"lucid_media.focal_y",
									"lucid_media.blur_hash",
									"lucid_media.average_color",
									"lucid_media.base64",
									"lucid_media.is_dark",
									"lucid_media.is_light",
								])
								.whereRef(
									"lucid_media.id",
									"=",
									"cb_user.profile_picture_media_id",
								)
								.where(
									"lucid_media.is_deleted",
									"=",
									this.dbAdapter.getDefault("boolean", "false"),
								),
						)
						.as("cb_user_profile_picture"),
					this.dbAdapter
						.jsonArrayFrom(
							eb
								.selectFrom("lucid_media")
								.select([
									"lucid_media.id",
									"lucid_media.key",
									"lucid_media.type",
									"lucid_media.mime_type",
									"lucid_media.file_extension",
									"lucid_media.file_name",
									"lucid_media.file_size",
									"lucid_media.width",
									"lucid_media.height",
									"lucid_media.focal_x",
									"lucid_media.focal_y",
									"lucid_media.blur_hash",
									"lucid_media.average_color",
									"lucid_media.base64",
									"lucid_media.is_dark",
									"lucid_media.is_light",
								])
								.whereRef(
									"lucid_media.id",
									"=",
									"ub_user.profile_picture_media_id",
								)
								.where(
									"lucid_media.is_deleted",
									"=",
									this.dbAdapter.getDefault("boolean", "false"),
								),
						)
						.as("ub_user_profile_picture"),
				])
				// @ts-expect-error
				.where(`${props.tables.versions}.type`, "=", props.status);

			query = this.applyBrickFiltersToQuery(
				query,
				props.brickFilters,
				dynamicConfig.tableName,
				props.tables.versions,
			);

			const { main } = queryBuilder.main(
				{
					main: query,
				},
				{
					queryParams: {
						filter: props.documentFilters,
					},
					meta: {
						tableKeys: {
							filters: {
								id: `${dynamicConfig.tableName}.id`,
								collectionKey: `${dynamicConfig.tableName}.collection_key`,
								createdBy: `${dynamicConfig.tableName}.created_by`,
								updatedBy: `${dynamicConfig.tableName}.updated_by`,
								createdAt: `${dynamicConfig.tableName}.created_at`,
								updatedAt: `${dynamicConfig.tableName}.updated_at`,
								isDeleted: `${dynamicConfig.tableName}.is_deleted`,
								deletedBy: `${dynamicConfig.tableName}.deleted_by`,
							},
							sorts: {
								createdAt: `${dynamicConfig.tableName}.created_at`,
								updatedAt: `${dynamicConfig.tableName}.updated_at`,
							},
						},
					},
				},
			);

			return main.executeTakeFirst() as unknown as Promise<DocumentQueryResponse>;
		};

		const exec = await this.executeQuery(queryFn, {
			method: "selectSingleFiltered",
			tableName: dynamicConfig.tableName,
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			mode: "single",
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}

	async selectMultipleUnion(props: { tables: LucidDocumentTableName[] }) {
		if (props.tables.length === 0) {
			return {
				error: undefined,
				data: [],
			};
		}

		const unionQueries = props.tables.map((table) => {
			return this.db
				.selectFrom(table)
				.select([`${table}.id`, `${table}.collection_key`]);
		});

		let query = unionQueries[0];

		if (query === undefined) {
			return {
				error: undefined,
				data: [],
			};
		}

		for (let i = 1; i < unionQueries.length; i++) {
			const iQuery = unionQueries[i];
			if (iQuery === undefined) continue;
			query = query.unionAll(iQuery);
		}

		const exec = await this.executeQuery(
			() =>
				query.execute() as unknown as Promise<
					{
						id: number;
						collection_key: string;
					}[]
				>,
			{
				method: "selectMultipleUnion",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			enabled: false,
			mode: "multiple",
		});
	}

	// ----------------------------------------
	// helpers
	applyBrickFiltersToQuery<DB, Table extends keyof DB, O>(
		query: SelectQueryBuilder<DB, Table, O>,
		brickFilters: BrickFilters[],
		documentTableName: string,
		versionTableName?: string,
	): SelectQueryBuilder<DB, Table, O> {
		if (!brickFilters || brickFilters.length === 0) {
			return query;
		}

		const { table, ref } = this.db.dynamic;

		return query.where((eb) => {
			const filterConditions = brickFilters.map((brickFilter) => {
				let subQuery = this.db
					.selectFrom(table(brickFilter.table).as("bf"))
					.whereRef(ref("bf.document_id"), "=", ref(`${documentTableName}.id`));
				if (versionTableName !== undefined) {
					subQuery = subQuery.whereRef(
						ref("bf.document_version_id"),
						"=",
						ref(`${versionTableName}.id`),
					);
				}

				for (const filter of brickFilter.filters) {
					subQuery = subQuery.where(
						ref(`bf.${filter.column}`),
						filter.operator as ComparisonOperatorExpression,
						filter.value,
					);
				}

				return eb.exists(subQuery.select(sql.lit(1).as("exists")));
			});
			return eb.and(filterConditions);
		});
	}
}
