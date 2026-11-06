import type { LucidDatabase } from "../db/client/index.js";
import type { LucidTranslationStyles } from "../db/tables/index.js";
import { translationStylesTable } from "../db/tables/translation-styles.js";
import type { Insert } from "../db/types.js";
import StaticRepository from "./parents/static-repository.js";

export default class TranslationStylesRepository extends StaticRepository<"lucid_translation_styles"> {
	constructor(db: LucidDatabase) {
		super(db, translationStylesTable);
	}

	async upsertSingle(props: { data: Insert<LucidTranslationStyles> }) {
		const query = this.db
			.insertInto("lucid_translation_styles")
			.values(this.asInsertData(props.data))
			.onConflict((conflict) =>
				conflict.column("locale").doUpdateSet((eb) => ({
					instructions: eb.ref("excluded.instructions"),
					updated_by: eb.ref("excluded.updated_by"),
					updated_at: eb.ref("excluded.updated_at"),
				})),
			);

		const exec = await this.executeQuery(() => query.execute(), {
			method: "upsertSingle",
		});

		return exec.response;
	}
}
