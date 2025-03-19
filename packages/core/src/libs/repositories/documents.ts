import z from "zod";
import { sql } from "kysely";
import DynamicRepository from "./parents/dynamic-repository.js";
import type {
	LucidDocumentTable,
	Insert,
	Select,
	LucidDocumentTableName,
} from "../db/types.js";
import type { QueryProps, DynamicConfig } from "./types.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class DocumentsRepository extends DynamicRepository<LucidDocumentTableName> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document__collection-key");
	}
	tableSchema = z.object({
		id: z.number(),
		collection_key: z.string(),
		is_deleted: z.union([
			z.literal(this.dbAdapter.config.defaults.boolean.true),
			z.literal(this.dbAdapter.config.defaults.boolean.false),
		]),
		is_deleted_at: z.string().optional(),
		deleted_by: z.number().nullable(),
		created_by: z.number(),
		created_at: z.string().nullable(),
		updated_by: z.number(),
		update_at: z.string().nullable(),
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
			}
		>,
		dynamicConfig: DynamicConfig<LucidDocumentTableName>,
	) {
		const query = this.db.selectFrom(dynamicConfig.tableName);

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "selectSingleById",
			tableName: dynamicConfig.tableName,
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			selectAll: true,
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
}
