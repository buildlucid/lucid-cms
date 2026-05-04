import z from "zod";
import type DatabaseAdapter from "../db/adapter-base.js";
import type {
	Insert,
	KyselyDB,
	LucidRoleTranslations,
	Select,
} from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class RoleTranslationsRepository extends StaticRepository<"lucid_role_translations"> {
	constructor(db: KyselyDB, dbAdapter: DatabaseAdapter) {
		super(db, dbAdapter, "lucid_role_translations");
	}
	tableSchema = z.object({
		id: z.number(),
		role_id: z.number(),
		locale_code: z.string(),
		name: z.string().nullable(),
		description: z.string().nullable(),
	});
	columnFormats = {
		id: this.dbAdapter.getDataType("primary"),
		role_id: this.dbAdapter.getDataType("integer"),
		locale_code: this.dbAdapter.getDataType("text"),
		name: this.dbAdapter.getDataType("text"),
		description: this.dbAdapter.getDataType("text"),
	};
	queryConfig = undefined;

	/**
	 * Upserts internal admin UI role translations using the supplied row as truth.
	 */
	async upsertMultiple<
		K extends keyof Select<LucidRoleTranslations>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<LucidRoleTranslations>>[];
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		const query = this.db
			.insertInto("lucid_role_translations")
			.values(
				props.data.map((d) =>
					this.formatData(d, {
						type: "insert",
					}),
				),
			)
			.onConflict((oc) =>
				oc.columns(["role_id", "locale_code"]).doUpdateSet((eb) => ({
					name: eb.ref("excluded.name"),
					description: eb.ref("excluded.description"),
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
				query.execute() as Promise<Pick<Select<LucidRoleTranslations>, K>[]>,
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
