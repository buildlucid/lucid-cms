import { type SelectQueryBuilder, sql } from "kysely";
import z from "zod/v4";
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
import type CollectionBuilder from "../builders/collection-builder/index.js";
import type { CollectionSchemaTable } from "../collection/schema/types.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type {
	DocumentVersionType,
	Insert,
	KyselyDB,
	LucidDocumentTable,
	LucidDocumentTableName,
	LucidVersionTableName,
	Select,
} from "../db-adapter/types.js";
import queryBuilder from "../query-builder/index.js";
import DynamicRepository from "./parents/dynamic-repository.js";
import type { DynamicConfig, QueryProps } from "./types.js";

export interface DocumentQueryResponse extends Select<LucidDocumentTable> {
	// Created by user join
	cb_user_id?: number | null;
	cb_user_email?: string | null;
	cb_user_first_name?: string | null;
	cb_user_last_name?: string | null;
	cb_user_username?: string | null;
	// Updated by user join
	ub_user_id?: number | null;
	ub_user_email?: string | null;
	ub_user_first_name?: string | null;
	ub_user_last_name?: string | null;
	ub_user_username?: string | null;
	// Target Version
	version_id?: number | null;
	version_type?: DocumentVersionType | null;
	version_promoted_from?: number | null;
	version_created_at?: Date | string | null;
	version_created_by?: number | null;
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
		ub_user_id: z.number().nullable(),
		ub_user_email: z.email().nullable(),
		ub_user_first_name: z.string().nullable(),
		ub_user_last_name: z.string().nullable(),
		ub_user_username: z.string().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
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
			config: Config;
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
									.select((eb) => [
										`${props.tables.versions}.id`,
										`${props.tables.versions}.type`,
										`${props.tables.versions}.promoted_from`,
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
				])
				// @ts-expect-error
				.select([
					`${props.tables.versions}.id as version_id`,
					`${props.tables.versions}.type as version_type`,
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
				.select((eb) =>
					sql`count(distinct ${sql.ref(`${dynamicConfig.tableName}.id`)})`.as(
						"count",
					),
				)
				// @ts-expect-error
				.where(`${props.tables.versions}.type`, "=", props.status);

			query = this.applyBrickFiltersToQuery(
				query,
				props.brickFilters,
				dynamicConfig.tableName,
			);
			queryCount = this.applyBrickFiltersToQuery(
				queryCount,
				props.brickFilters,
				dynamicConfig.tableName,
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
									.select((eb) => [
										`${props.tables.versions}.id`,
										`${props.tables.versions}.type`,
										`${props.tables.versions}.promoted_from`,
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
									),
							)
							.as("versions"),
				])
				// @ts-expect-error
				.select([
					`${props.tables.versions}.id as version_id`,
					`${props.tables.versions}.type as version_type`,
				])
				// @ts-expect-error
				.where(`${props.tables.versions}.type`, "=", props.status);

			query = this.applyBrickFiltersToQuery(
				query,
				props.brickFilters,
				dynamicConfig.tableName,
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
	): SelectQueryBuilder<DB, Table, O> {
		if (!brickFilters || brickFilters.length === 0) {
			return query;
		}

		return query.where((eb) => {
			const filterConditions = brickFilters.map((brickFilter) => {
				return eb.exists(
					eb
						// @ts-expect-error
						.selectFrom(brickFilter.table)
						.whereRef(
							// @ts-expect-error
							`${brickFilter.table}.document_id`,
							"=",
							`${documentTableName}.id`,
						)
						.where((innerEb) => {
							return innerEb.and(
								brickFilter.filters.map((filter) => {
									return innerEb(
										// @ts-expect-error
										`${brickFilter.table}.${filter.column}`,
										filter.operator,
										filter.value,
									);
								}),
							);
						})
						.select(sql.lit(1).as("exists")),
				);
			});

			return eb.and(filterConditions);
		});
	}
}
