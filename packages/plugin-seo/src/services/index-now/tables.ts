import type { Generated } from "kysely";

/**
 * A site URL the sitemap lists or listed. Marked `pending` when it's new, changed or no longer
 * listed, and cleared once IndexNow accepts it. Unlisted rows are removed once that is sent.
 */
type IndexNowUrlRow = {
	id: Generated<number>;
	url: string;
	last_modified: string | null;
	listed: boolean | 0 | 1;
	pending: boolean | 0 | 1;
	/** The mark that last changed the row, so a send only clears rows no later mark changed. */
	revision: number;
};

/** IndexNow's one state row, which the migration inserts. */
type IndexNowStateRow = {
	id: Generated<number>;
	/** When IndexNow last accepted URLs, and how many. Null before the first. */
	last_sent_at: string | null;
	last_url_count: number | null;
	/** Counts marks. Each mark bumps it first, which also queues marks behind each other. */
	revision: number;
};

export type IndexNowTables = {
	plugin_seo_index_now_urls: IndexNowUrlRow;
	plugin_seo_index_now_state: IndexNowStateRow;
};
