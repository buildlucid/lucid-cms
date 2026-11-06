import type { LucidDatabase } from "../db/client/index.js";
import { translationGlossaryTable } from "../db/tables/translation-glossary.js";
import StaticRepository from "./parents/static-repository.js";

export default class TranslationGlossaryRepository extends StaticRepository<"lucid_translation_glossary"> {
	constructor(db: LucidDatabase) {
		super(db, translationGlossaryTable);
	}
}
