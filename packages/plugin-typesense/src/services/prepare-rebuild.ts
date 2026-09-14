import type { ServiceFn } from "@lucidcms/core/types";
import { Errors } from "typesense";
import IndexesRepository from "../repositories/indexes.js";
import type { IndexState } from "../repositories/types.js";
import WorkRepository from "../repositories/work.js";
import type { IndexOptions, ResolvedOptions } from "../types.js";
import providerError from "../utils/provider-error.js";

/** Repeats incomplete scan setup safely on databases without transactions. */
const prepareRebuild: ServiceFn<
	[
		{
			options: ResolvedOptions;
			index: IndexOptions;
			state: IndexState & { building_collection: string; rebuild_id: string };
			token: string;
		},
	],
	undefined
> = async (context, data) => {
	if (data.state.rebuild_prepared === data.state.rebuild_id)
		return { error: undefined, data: undefined };
	const { client } = data.options;
	try {
		await client.collections(data.state.building_collection).retrieve();
	} catch (error) {
		if (!(error instanceof Errors.ObjectNotFound))
			return { error: providerError(error), data: undefined };
		try {
			await client.collections().create({
				...data.index.schema,
				name: data.state.building_collection,
				fields: [
					...data.index.schema.fields,
					{ name: "_lucid_owner", type: "string", facet: true },
					{ name: "_lucid_revision", type: "string", facet: true },
				],
				metadata: {
					...data.index.schema.metadata,
					lucidPlugin: "typesense",
					lucidIndex: data.index.key,
					lucidAlias: data.index.alias,
				},
			});
		} catch (error) {
			return { error: providerError(error), data: undefined };
		}
	}

	const Work = new WorkRepository(context.db);
	const removed = await Work.removeUnknownSources({
		indexKey: data.index.key,
		sourceKeys: data.index.sources.map((source) => source.key),
	});
	if (removed.error) return removed;

	for (const source of data.index.sources) {
		const queued = await Work.put({
			indexKey: data.index.key,
			sourceKey: source.key,
			ids: [0],
			revision: data.state.rebuild_id,
		});
		if (queued.error) return queued;
	}

	const Indexes = new IndexesRepository(context.db);
	const prepared = await Indexes.update({
		indexKey: data.index.key,
		token: data.token,
		values: { rebuild_prepared: data.state.rebuild_id },
	});
	if (prepared.error) return prepared;

	return { error: undefined, data: undefined };
};

export default prepareRebuild;
