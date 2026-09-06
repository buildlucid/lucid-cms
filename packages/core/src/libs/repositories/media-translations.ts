import type { LucidDatabase } from "../db/client/index.js";
import type { LucidMediaTranslations } from "../db/tables/index.js";
import { mediaTranslationsTable } from "../db/tables/media-translations.js";
import type { Insert, Select } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";
import type { QueryProps } from "./types.js";

export default class MediaTranslationsRepository extends StaticRepository<"lucid_media_translations"> {
	constructor(db: LucidDatabase) {
		super(db, mediaTranslationsTable);
	}
	// ------------------------------------------
	// queries
	async upsertSingle<
		K extends keyof Select<LucidMediaTranslations>,
		V extends boolean = false,
	>(
		props: QueryProps<
			V,
			{
				data: Partial<Insert<LucidMediaTranslations>>;
				returning?: K[];
				returnAll?: true;
			}
		>,
	) {
		const query = this.db
			.insertInto("lucid_media_translations")
			.values(this.asInsertData(props.data))
			.onConflict((oc) =>
				(props.data.locale_code === null
					? oc.columns(["media_id"]).where("locale_code", "is", null)
					: oc.columns(["media_id", "locale_code"])
				).doUpdateSet((eb) => ({
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
				query.executeTakeFirst() as Promise<
					Pick<Select<LucidMediaTranslations>, K> | undefined
				>,
			{ method: "upsertSingle" },
		);
		if (exec.response.error) return exec.response;

		return this.validateResponse(exec, {
			...props.validation,
			mode: "single",
			select: props.returning as string[],
			selectAll: props.returnAll,
		});
	}
	/** Assigns unlabelled text once; an existing default translation takes precedence. */
	async adoptUnassigned(props: { localeCode: string | null; mediaId: number }) {
		if (props.localeCode === null) return { error: undefined, data: undefined };

		const query = this.db
			.updateTable("lucid_media_translations")
			.set({ locale_code: props.localeCode })
			.where("locale_code", "is", null)
			.where("media_id", "=", props.mediaId);

		const superseded = this.db
			.deleteFrom("lucid_media_translations")
			.where("media_id", "=", props.mediaId)
			.where("locale_code", "is", null)
			.where((eb) =>
				eb.exists(
					eb
						.selectFrom("lucid_media_translations as assigned")
						.select("assigned.id")
						.whereRef(
							"assigned.media_id",
							"=",
							"lucid_media_translations.media_id",
						)
						.where("assigned.locale_code", "=", props.localeCode),
				),
			);

		const result = await this.executeQuery(
			async () => {
				await superseded.execute();
				return query.execute();
			},
			{ method: "adoptUnassigned" },
		);
		if (result.response.error) return result.response;

		return { error: undefined, data: undefined };
	}
}
