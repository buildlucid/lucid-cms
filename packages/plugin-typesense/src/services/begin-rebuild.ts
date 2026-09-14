import type { ServiceFn } from "@lucidcms/core/types";
import GenerationsRepository from "../repositories/generations.js";
import IndexesRepository from "../repositories/indexes.js";
import type { IndexOptions } from "../types.js";

/** Records rebuild intent before any provider writes. Jobs resume it after failures. */
const beginRebuild: ServiceFn<
	[
		{
			index: IndexOptions;
			token: string;
		},
	],
	{ rebuildId: string; collection: string }
> = async (context, data) => {
	const rebuildId = crypto.randomUUID();
	const collection = `${data.index.alias}__lucid_${rebuildId.replaceAll("-", "")}`;

	const Indexes = new IndexesRepository(context.db);
	const Generations = new GenerationsRepository(context.db);
	const recorded = await Generations.create({
		index_key: data.index.key,
		collection_name: collection,
	});
	if (recorded.error) return recorded;

	const saved = await Indexes.update({
		indexKey: data.index.key,
		token: data.token,
		values: {
			building_collection: collection,
			rebuild_id: rebuildId,
			rebuild_requested: new Date().toISOString(),
			rebuild_completed: null,
			rebuild_prepared: null,
			rebuild_processed: 0,
			last_error: null,
		},
	});
	if (saved.error) return saved;

	return { error: undefined, data: { rebuildId, collection } };
};

export default beginRebuild;
