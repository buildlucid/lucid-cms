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

export default class DocumentsRepository extends DynamicRepository<LucidDocumentTableName> {
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
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		collection_key: this.dbAdapter.getDataType("text"),
		is_deleted: this.dbAdapter.getDataType("boolean"),
		is_deleted_at: this.dbAdapter.getDataType("timestamp"),
		deleted_by: this.dbAdapter.getDataType("integer"),
		created_by: this.dbAdapter.getDataType("integer"),
		created_at: this.dbAdapter.getDataType("timestamp"),
	};
	queryConfig = undefined;

	// ----------------------------------------
	// queries
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
					is_deleted: sql`excluded.is_deleted`,
					is_deleted_at: eb.ref("excluded.is_deleted_at"),
					deleted_by: eb.ref("excluded.deleted_by"),
				})),
			)
			.$if(
				props.returnAll !== true &&
					props.returning !== undefined &&
					props.returning.length > 0,
				// @ts-expect-error
				(qb) => qb.returning(props.returning),
			)
			.$if(props.returnAll ?? false, (qb) => qb.returningAll());

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "upsertMultiple",
			tableName: dynamicConfig.tableName,
		});
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.returning as string[],
			selectAll: props.returnAll,
			schema: this.mergeSchema(dynamicConfig.schema),
		});
	}
}
