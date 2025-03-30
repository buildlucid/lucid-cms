import z from "zod";
import { sql } from "kysely";
import DynamicRepository from "./parents/dynamic-repository.js";
import type {
	LucidDocumentTable,
	Insert,
	Select,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../db/types.js";
import type { QueryProps, DynamicConfig } from "./types.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

import DocumentVersionsRepository from "./document-versions.js";
import { versionTypesSchema } from "../../schemas/document-versions.js";

export default class DocumentsRepository extends DynamicRepository<LucidDocumentTableName> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document__collection-key");
	}
	tableSchema = z.object({
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.string().optional(),
		deleted_by: z.number().nullable(),

		id: z.number(),
		collection_key: z.string(),
		created_by: z.number(),
		created_at: z.string().nullable(),
		updated_by: z.number(),
		updated_at: z.string().nullable(),
		versions: z.array(
			z.object({
				id: z.number(),
				version_type: versionTypesSchema,
				created_by: z.number(),
				created_at: z.string(),
				updated_by: z.number().nullable(),
				updated_at: z.string().nullable(),
			}),
		),
		cb_user_id: z.number(),
		cb_user_email: z.string().email(),
		cb_user_first_name: z.string().nullable(),
		cb_user_last_name: z.string().nullable(),
		cb_user_username: z.string(),
		ub_user_id: z.number(),
		ub_user_email: z.string().email(),
		ub_user_first_name: z.string().nullable(),
		ub_user_last_name: z.string().nullable(),
		ub_user_username: z.string(),
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
				status?: "draft" | "published" | "revision";
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
									`${props.tables.versions}.type as version_type`,
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
									eb.or([
										// @ts-expect-error
										eb(`${props.tables.versions}.type`, "=", "draft"),
										// @ts-expect-error
										eb(`${props.tables.versions}.type`, "=", "published"),
									]),
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
			.where(`${dynamicConfig.tableName}.id`, "=", props.id)
			.where(
				`${dynamicConfig.tableName}.is_deleted`,
				"=",
				this.dbAdapter.getDefault("boolean", "false"),
			);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleById",
			tableName: dynamicConfig.tableName,
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
}
