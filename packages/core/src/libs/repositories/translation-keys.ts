import queryBuilder, {
	type QueryBuilderWhere,
} from "../query-builder/index.js";
import type { KyselyDB } from "../db/types.js";
import type DatabaseAdapter from "../db/adapter.js";

export default class TranslationKeysRepo {
	constructor(
		private db: KyselyDB,
		private dbAdapter: DatabaseAdapter,
	) {}

	// ----------------------------------------
	// delete
	deleteMultiple = async (props: {
		where: QueryBuilderWhere<"lucid_translation_keys">;
	}) => {
		let query = this.db.deleteFrom("lucid_translation_keys");

		query = queryBuilder.delete(query, props.where);

		return query.execute();
	};
	// ----------------------------------------
	// create
	createMultiple = async (
		props: {
			createdAt: string;
		}[],
	) => {
		return this.db
			.insertInto("lucid_translation_keys")
			.values(props.map((d) => ({ created_at: d.createdAt })))
			.returning("id")
			.execute();
	};
}
