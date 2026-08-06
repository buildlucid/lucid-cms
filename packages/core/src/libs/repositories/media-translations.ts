import type { LucidDatabase } from "../db/client/index.js";
import type { LucidMediaTranslations } from "../db/tables/index.js";
import { mediaTranslationsTable } from "../db/tables/media-translations.js";
import type { Insert, Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class MediaAwaitingSyncRepository extends StaticRepository<"lucid_media_translations"> {
	constructor(db: LucidDatabase) {
		super(db, mediaTranslationsTable);
	}

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
			.values(props.data.map((data) => this.asInsertData(data)))
			.onConflict((oc) =>
				oc.columns(["media_id", "locale_code"]).doUpdateSet((eb) => ({
					title: eb.ref("excluded.title"),
					alt: eb.ref("excluded.alt"),
					description: eb.ref("excluded.description"),
					summary: eb.ref("excluded.summary"),
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
