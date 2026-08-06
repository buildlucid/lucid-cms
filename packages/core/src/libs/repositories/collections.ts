import type { LucidDatabase } from "../db/client/index.js";
import { collectionsTable } from "../db/tables/collections.js";
import StaticRepository from "./parents/static-repository.js";

export default class CollectionsRepository extends StaticRepository<"lucid_collections"> {
	constructor(db: LucidDatabase) {
		super(db, collectionsTable);
	}
}
