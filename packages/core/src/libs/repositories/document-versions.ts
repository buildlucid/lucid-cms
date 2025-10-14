import { sql } from "kysely";
import z from "zod/v4";
import { versionTypesSchema } from "../../schemas/document-versions.js";
import type { GetMultipleRevisionsQueryParams } from "../../schemas/documents.js";
import type { BrickTypes } from "../builders/brick-builder/types.js";
import type {
	CollectionSchemaColumn,
	CollectionSchemaTable,
} from "../collection/schema/types.js";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type {
	DocumentVersionType,
	KyselyDB,
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTable,
	LucidVersionTableName,
	Select,
} from "../db-adapter/types.js";
import queryBuilder from "../query-builder/index.js";
import type { BrickQueryResponse } from "./document-bricks.js";
import DynamicRepository from "./parents/dynamic-repository.js";
import type { DynamicConfig, QueryProps } from "./types.js";

export interface RevisionsQueryResponse extends Select<LucidVersionTable> {
	// documents
	document_created_by?: number | null;
	document_created_at?: Date | string | null;
	document_updated_by?: number | null;
	document_updated_at?: Date | string | null;
	// brick count
	[key: LucidBrickTableName]: Array<{
		id: number;
		locale: string;
		brick_instance_id: string;
		brick_type: BrickTypes;
	}>;
}

export default class DocumentVersionsRepository extends DynamicRepository<LucidVersionTableName> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document__collection-key__versions");
	}
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		document_id: z.number(),
		type: versionTypesSchema,
		promoted_from: z.number().nullable(),
		created_by: z.number(),
		updated_by: z.number(),
		updated_at: z.union([z.string(), z.date()]).nullable(),
		created_at: z.union([z.string(), z.date()]).nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		document_id: this.dbAdapter.getDataType("integer"),
		type: this.dbAdapter.getDataType("text"),
		promoted_from: this.dbAdapter.getDataType("integer"),
		created_by: this.dbAdapter.getDataType("integer"),
		updated_by: this.dbAdapter.getDataType("integer"),
		updated_at: this.dbAdapter.getDataType("timestamp"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	/**
	 * Takes a group of document IDs and their tables, document-field table schema and fetches all document-field rows for that version
	 */
	async selectMultipleUnion<V extends boolean = false>(
		props: QueryProps<
			V,
			{
				unions: Array<{
					collectionKey: string;
					tables: {
						document: LucidDocumentTableName;
						version: LucidVersionTableName;
						documentFields: LucidBrickTableName;
					};
					documentFieldSchema: CollectionSchemaTable<LucidBrickTableName>;
					ids: number[];
				}>;
				/** The status used to determine which version of the document custom field relations to fetch */
				versionType: Exclude<DocumentVersionType, "revision">;
			}
		>,
	) {
		if (props.unions.length === 0) {
			return {
				error: undefined,
				data: [],
			};
		}

		const unionQueries = props.unions.map(
			({ tables, ids, documentFieldSchema }) => {
				return (
					this.db
						.selectFrom(tables.version)
						.innerJoin(tables.document, (join) =>
							join.onRef(
								`${tables.document}.id`,
								"=",
								// @ts-expect-error
								`${tables.version}.document_id`,
							),
						)
						// @ts-expect-error
						.select([
							`${tables.version}.id`,
							`${tables.version}.collection_key`,
							`${tables.version}.document_id`,
							`${tables.version}.type`,
							`${tables.version}.created_by`,
							`${tables.version}.updated_by`,
							`${tables.version}.created_at`,
							`${tables.version}.updated_at`,
						])
						.select((eb) => [
							this.dbAdapter
								.jsonArrayFrom(
									this.db
										.selectFrom(tables.documentFields)
										.whereRef(
											`${tables.documentFields}.document_id`,
											"=",
											`${tables.version}.document_id`,
										)
										.whereRef(
											`${tables.documentFields}.document_version_id`,
											"=",
											`${tables.version}.id`,
										)
										.select(
											documentFieldSchema.columns.map(
												(column) => `${tables.documentFields}.${column.name}`,
											),
										),
								)
								.as(tables.documentFields),
						])
						// @ts-expect-error
						.where(`${tables.version}.type`, "=", props.versionType)
						// @ts-expect-error
						.where(`${tables.version}.document_id`, "in", ids)
						.where(
							`${tables.document}.is_deleted`,
							"=",
							this.dbAdapter.getDefault("boolean", "false"),
						)
				);
			},
		);

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
			() => query.execute() as unknown as Promise<BrickQueryResponse[]>,
			{
				method: "selectMultipleByIdsUnion",
			},
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
		});
	}
	/**
	 * Selects all of the revisions for a given document ID and returns basic info for each brick table for meta data
	 */
	async selectMultipleRevisions(
		props: {
			documentId: number;
			query: GetMultipleRevisionsQueryParams;
			tables: {
				document: LucidDocumentTableName;
			};
			bricksSchema: Array<{
				name: LucidBrickTableName;
				columns: Array<CollectionSchemaColumn>;
			}>;
		},
		dynamicConfig: DynamicConfig<LucidVersionTableName>,
	) {
		const queryFn = async () => {
			let query = this.db
				.selectFrom(dynamicConfig.tableName)
				.innerJoin(props.tables.document, (join) =>
					join.onRef(
						`${props.tables.document}.id`,
						"=",
						// @ts-expect-error
						`${dynamicConfig.tableName}.document_id`,
					),
				)
				// @ts-expect-error
				.select([
					`${dynamicConfig.tableName}.id`,
					`${dynamicConfig.tableName}.type`,
					`${dynamicConfig.tableName}.promoted_from`,
					`${dynamicConfig.tableName}.created_at`,
					`${dynamicConfig.tableName}.created_by`,
					`${dynamicConfig.tableName}.document_id`,
					`${dynamicConfig.tableName}.collection_key`,
					`${props.tables.document}.created_by as document_created_by`,
					`${props.tables.document}.created_at as document_created_at`,
					`${props.tables.document}.updated_by as document_updated_by`,
					`${props.tables.document}.updated_at as document_updated_at`,
				])
				.where(
					`${props.tables.document}.is_deleted`,
					"=",
					this.dbAdapter.getDefault("boolean", "false"),
				)
				// @ts-expect-error
				.where(`${dynamicConfig.tableName}.document_id`, "=", props.documentId)
				// @ts-expect-error
				.where(`${dynamicConfig.tableName}.type`, "=", "revision");

			for (const brick of props.bricksSchema) {
				query = query.select(() =>
					this.dbAdapter
						.jsonArrayFrom(
							this.db
								.selectFrom(brick.name)
								.whereRef(
									`${brick.name}.document_version_id`,
									"=",
									`${dynamicConfig.tableName}.id`,
								)
								.select([
									`${brick.name}.id`,
									`${brick.name}.locale`,
									`${brick.name}.brick_instance_id`,
									`${brick.name}.brick_type`,
								]),
						)
						.as(brick.name),
				);
			}

			const queryCount = this.db
				.selectFrom(dynamicConfig.tableName)
				.innerJoin(props.tables.document, (join) =>
					join.onRef(
						`${props.tables.document}.id`,
						"=",
						// @ts-expect-error
						`${dynamicConfig.tableName}.document_id`,
					),
				)
				.select(
					sql`count(distinct ${sql.ref(`${dynamicConfig.tableName}.id`)})`.as(
						"count",
					),
				)
				.where(
					`${props.tables.document}.is_deleted`,
					"=",
					this.dbAdapter.getDefault("boolean", "false"),
				)
				// @ts-expect-error
				.where(`${dynamicConfig.tableName}.document_id`, "=", props.documentId)
				// @ts-expect-error
				.where(`${dynamicConfig.tableName}.type`, "=", "revision");

			const { main, count } = queryBuilder.main(
				{
					main: query,
					count: queryCount,
				},
				{
					queryParams: {
						filter: props.query.filter,
						sort: props.query.sort,
						page: props.query.page,
						perPage: props.query.perPage,
					},
					meta: {
						tableKeys: {
							filters: {
								createdBy: `${dynamicConfig.tableName}.created_by`,
							},
							sorts: {
								createdAt: `${dynamicConfig.tableName}.created_at`,
							},
						},
					},
				},
			);

			const [mainResult, countResult] = await Promise.all([
				main.execute() as unknown as Promise<RevisionsQueryResponse[]>,
				count?.executeTakeFirst() as Promise<{ count: string } | undefined>,
			]);

			return [mainResult, countResult] as const;
		};

		const exec = await this.executeQuery(queryFn, {
			method: "selectMultipleRevisions",
			tableName: dynamicConfig.tableName,
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			mode: "multiple-count",
		});
	}
}
