import type { LucidDatabase } from "../db/client/index.js";
import { localesTable } from "../db/tables/locales.js";
import StaticRepository from "./parents/static-repository.js";

export default class LocalesRepository extends StaticRepository<"lucid_locales"> {
	constructor(db: LucidDatabase) {
		super(db, localesTable);
	}
}
