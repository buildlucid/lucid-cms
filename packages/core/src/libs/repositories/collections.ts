import type { LucidDatabase } from "../db/client/index.js";
import { collectionsTable } from "../db/tables/collections.js";
import StaticRepository from "./parents/static-repository.js";

export default class CollectionsRepository extends StaticRepository<"lucid_collections"> {
	constructor(db: LucidDatabase) {
		super(db, collectionsTable);
	}
	/**
	 * Locks the collection row until commit to serialize checked inserts. SQLite serializes write
	 * transactions without row locks.
	 */
	async lockForUpdate(props: { key: string }) {
		if (!this.dbAdapter.supports("sharedRowLocks")) {
			return { error: undefined, data: undefined };
		}

		const query = this.db
			.selectFrom("lucid_collections")
			.select("key")
			.where("key", "=", props.key)
			.forUpdate();

		const exec = await this.executeQuery(() => query.executeTakeFirst(), {
			method: "lockForUpdate",
		});
		if (exec.response.error) return exec.response;

		return { error: undefined, data: undefined };
	}
}
