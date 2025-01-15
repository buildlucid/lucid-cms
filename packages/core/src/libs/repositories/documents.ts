import z from "zod";
import { sql } from "kysely";
import StaticRepository from "./parents/static-repository.js";
import type {
	LucidDocumentTable,
	Insert,
	KyselyDB,
	Select,
} from "../db/types.js";
import type { QueryProps } from "./types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class DocumentsRepository extends StaticRepository<"lucid_document__"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_document__");
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
				collectionKey: string;
				data: Partial<Insert<LucidDocumentTable>>[];
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		const query = this.db
			.insertInto(`lucid_document__${props.collectionKey}`)
			.values(props.data.map((d) => this.formatData(d, "insert")))
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

		const exec = await this.executeQuery("upsertMultiple", () =>
			query.executeTakeFirst(),
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "multiple",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}
}
