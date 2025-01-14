import z from "zod";
import BaseRepository from "./base-repository.js";
import queryBuilder from "../query-builder/index.js";
import type {
	KyselyDB,
	Select,
	Insert,
	LucidTranslations,
} from "../db/types.js";
import type { QueryBuilderWhere } from "../query-builder/index.js";
import type { QueryProps } from "./types.js";
import type DatabaseAdapter from "../db/adapter.js";
export default class TranslationsRepository extends BaseRepository<"lucid_translations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_translations");
	}
	tableSchema = z.object({
		id: z.number(),
		translation_key_id: z.number(),
		locale_code: z.string(),
		value: z.string().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		translation_key_id: this.dbAdapter.getDataType("integer"),
		locale_code: this.dbAdapter.getDataType("text"),
		value: this.dbAdapter.getDataType("text"),
	};
	queryConfig = undefined;

	// ----------------------------------------
	// queries
	async upsertMultiple<
		K extends keyof Select<LucidTranslations>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<LucidTranslations>>[];
				where: QueryBuilderWhere<"lucid_translations">;
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		let query = this.db
			.insertInto("lucid_translations")
			.values(props.data.map((d) => this.formatData(d, "insert")))
			.onConflict((oc) =>
				oc.columns(["translation_key_id", "locale_code"]).doUpdateSet((eb) => ({
					value: eb.ref("excluded.value"),
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

		// @ts-expect-error
		query = queryBuilder.update(query, props.where);

		const exec = await this.executeQuery("upsertMultiple", () =>
			query.execute(),
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
