import type { Generated } from "kysely";

/** A path a page used in a published version. Rows for its current path are kept too, so they're in place once it changes. */
type PathHistoryRow = {
	id: Generated<number>;
	collection_key: string;
	document_id: number;
	environment: string;
	locale: string | null;
	path: string;
	recorded_at: string;
};

export type PathHistoryTables = {
	plugin_pages_path_history: PathHistoryRow;
};
