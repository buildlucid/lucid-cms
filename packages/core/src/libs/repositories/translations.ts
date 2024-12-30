import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class TranslationsRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// update / create
	upsertMultiple = async (
		props: {
			value: string | null;
			localeCode: string;
			translationKeyId: number;
		}[],
	) => {
		return this.db
			.insertInto("lucid_translations")
			.values(
				props.map((t) => ({
					value: t.value,
					locale_code: t.localeCode,
					translation_key_id: t.translationKeyId,
				})),
			)
			.onConflict((oc) =>
				oc.columns(["translation_key_id", "locale_code"]).doUpdateSet((eb) => ({
					value: eb.ref("excluded.value"),
				})),
			)
			.execute();
	};
}
