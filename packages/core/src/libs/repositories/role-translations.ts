import type { LucidDatabase } from "../db/client/index.js";
import type { LucidRoleTranslations } from "../db/tables/index.js";
import { roleTranslationsTable } from "../db/tables/role-translations.js";
import type { Insert, Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class RoleTranslationsRepository extends StaticRepository<"lucid_role_translations"> {
	constructor(db: LucidDatabase) {
		super(db, roleTranslationsTable);
	}

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
			.values(props.data.map((data) => this.asInsertData(data)))
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
