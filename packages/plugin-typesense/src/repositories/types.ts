import { z } from "@lucidcms/core";

export type IndexState = {
	index_key: string;
	active_collection: string | null;
	building_collection: string | null;
	rebuild_id: string | null;
	rebuild_prepared: string | null;
	rebuild_requested: string | null;
	rebuild_completed: string | null;
	rebuild_processed: number;
	lock_token: string | null;
	lock_until: string | null;
	last_error: string | null;
	last_success: string | null;
};

export const pendingWorkSchema = z.object({
	index_key: z.string(),
	source_key: z.string(),
	document_id: z.number().int(),
	revision: z.string(),
	cursor: z.number().int(),
});

export type PendingWork = z.infer<typeof pendingWorkSchema>;

export type Generation = { index_key: string; collection_name: string };

export type PluginTables = {
	plugin_typesense_generations: Generation;
	plugin_typesense_indexes: IndexState;
	plugin_typesense_work: PendingWork;
};
