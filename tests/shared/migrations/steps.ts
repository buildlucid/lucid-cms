import type { LucidConfig } from "@lucidcms/core/types";
import {
	ARTICLE_KEY,
	addedArticle,
	baseArticle,
	defaultsArticle,
	removedArticle,
	retypedArticle,
} from "./collections/article.ts";
import EverythingCollection from "./collections/everything.ts";
import largeModel from "./collections/large.ts";
import { createNotesMigration, EXTERNAL_TABLES } from "./external/notes.ts";
import notesPlugin from "./external/plugin.ts";

/** What a step adds to a setup's config. Steps only add, so the shared content model stays as it is. */
export type SchemaStep = Pick<
	LucidConfig,
	"collections" | "migrations" | "plugins" | "sources"
>;

export const INLINE_MIGRATION = "1790000000001-harness-inline-notes";
export const FAILING_MIGRATION = "1790000000004-harness-failing-notes";

const articleTable = `lucid_document__${ARTICLE_KEY}`;

/**
 * Named config versions for migration tests. `HARNESS_SCHEMA_STEP` selects the same version for
 * the CLI, in-process CMS and built server.
 */
const steps = {
	"article/base": { collections: [baseArticle] },
	"article/added": { collections: [addedArticle] },
	"article/removed": { collections: [removedArticle] },
	"article/retyped": { collections: [retypedArticle] },
	"article/defaults": { collections: [defaultsArticle] },
	/** The article with a second collection, which migrates after it. */
	"article/with-everything": {
		collections: [baseArticle, EverythingCollection],
	},
	everything: { collections: [EverythingCollection] },
	/** One migration from each place a project can register them: the config, a plugin and a folder. */
	external: {
		collections: [baseArticle],
		migrations: [
			{
				name: INLINE_MIGRATION,
				migration: createNotesMigration({
					table: EXTERNAL_TABLES.inline,
					references: articleTable,
				}),
			},
		],
		plugins: [notesPlugin(undefined)],
		sources: {
			//* relative to a setup's folder, as a URL from this module would not survive being bundled into a Worker
			migrations: ["../../shared/migrations/external/files"],
		},
	},
	"external/failing": {
		collections: [baseArticle],
		migrations: [
			{
				name: FAILING_MIGRATION,
				migration: createNotesMigration({
					table: EXTERNAL_TABLES.failing,
					references: articleTable,
					fails: true,
				}),
			},
		],
	},
	/** The failing migration with its bug fixed, under the same name. */
	"external/fixed": {
		collections: [baseArticle],
		migrations: [
			{
				name: FAILING_MIGRATION,
				migration: createNotesMigration({
					table: EXTERNAL_TABLES.failing,
					references: articleTable,
				}),
			},
		],
	},
	large: { collections: largeModel() },
	"large/changed": { collections: largeModel({ extraField: true }) },
} satisfies Record<string, SchemaStep>;

export type SchemaStepKey = keyof typeof steps;

export default steps;
