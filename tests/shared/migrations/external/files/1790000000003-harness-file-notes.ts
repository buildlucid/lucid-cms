import { ARTICLE_KEY } from "../../collections/article.ts";
import { createNotesMigration, EXTERNAL_TABLES } from "../notes.ts";

/** Found by its folder, as a file in a project's `database/migrations` is. */
export default createNotesMigration({
	table: EXTERNAL_TABLES.file,
	references: `lucid_document__${ARTICLE_KEY}`,
});
