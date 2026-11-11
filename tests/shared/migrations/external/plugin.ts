import { definePlugin } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import { ARTICLE_KEY } from "../collections/article.ts";
import { createNotesMigration, EXTERNAL_TABLES } from "./notes.ts";

export const PLUGIN_MIGRATION = "1790000000002-harness-plugin-notes";

/** A plugin whose only job is to register a migration, as plugins with their own tables do. */
const notesPlugin: LucidPlugin = () =>
	definePlugin({
		key: "harness-notes",
		configure: (draft) => {
			draft.migrations.push({
				name: PLUGIN_MIGRATION,
				migration: createNotesMigration({
					table: EXTERNAL_TABLES.plugin,
					references: `lucid_document__${ARTICLE_KEY}`,
				}),
			});
		},
	});

export default notesPlugin;
