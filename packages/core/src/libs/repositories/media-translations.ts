import z from "zod/v4";
import type DatabaseAdapter from "../db-adapter/adapter-base.js";
import type {
	Insert,
	KyselyDB,
	LucidMediaTranslations,
	Select,
} from "../db-adapter/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class MediaAwaitingSyncRepository extends StaticRepository<"lucid_media_translations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_media_translations");
	}
	tableSchema = z.object({
		id: z.number(),
		media_id: z.number(),
		locale_code: z.string(),
		title: z.string().nullable(),
		alt: z.string().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		media_id: this.dbAdapter.getDataType("integer"),
		locale_code: this.dbAdapter.getDataType("text"),
		title: this.dbAdapter.getDataType("text"),
		alt: this.dbAdapter.getDataType("text"),
	};
	queryConfig = undefined;

	// ------------------------------------------
	// queries
	async upsertMultiple<
		K extends keyof Select<LucidMediaTranslations>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<LucidMediaTranslations>>[];
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		const query = this.db
			.insertInto("lucid_media_translations")
			.values(
				props.data.map((d) =>
					this.formatData(d, {
						type: "insert",
					}),
				),
			)
			.onConflict((oc) =>
				oc.columns(["media_id", "locale_code"]).doUpdateSet((eb) => ({
					title: eb.ref("excluded.title"),
					alt: eb.ref("excluded.alt"),
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
				query.execute() as Promise<Pick<Select<LucidMediaTranslations>, K>[]>,
			{
				method: "upsertMultiple",
			},
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
