import type { CoreToolkit, ServiceFn } from "@lucidcms/core/types";
import type { SyncJob } from "../jobs/types.js";
import IndexesRepository from "../repositories/indexes.js";
import WorkRepository from "../repositories/work.js";
import type { ResolvedOptions } from "../types.js";
import enqueueSync from "../utils/enqueue-sync.js";

type Change =
	| { kind: "documents"; collectionKey: string; ids: number[] }
	| { kind: "media"; ids: number[] };

/** Persists source invalidations in the same context as the content mutation. */
const recordChange: ServiceFn<
	[
		{
			options: ResolvedOptions;
			toolkit: CoreToolkit;
			job: SyncJob;
			change: Change;
		},
	],
	undefined
> = async (context, data) => {
	const Work = new WorkRepository(context.db);
	const Indexes = new IndexesRepository(context.db);
	for (const index of data.options.indexes) {
		let pending = false;
		for (const source of index.sources) {
			const direct =
				source.kind === "media"
					? data.change.kind === "media"
					: data.change.kind === "documents" &&
						source.collection === data.change.collectionKey;
			const dependent =
				source.kind === "collection" &&
				(data.change.kind === "media"
					? source.dependencies?.media
					: source.dependencies?.collections?.includes(
							data.change.collectionKey,
						));
			if (!direct && !dependent) continue;

			if (!pending) {
				const ensured = await Indexes.ensure(index.key);
				if (ensured.error) return ensured;
			}

			const stored = await Work.put({
				indexKey: index.key,
				sourceKey: source.key,
				ids: dependent
					? [0, ...(direct ? data.change.ids : [])]
					: data.change.ids,
				revision: crypto.randomUUID(),
			});
			if (stored.error) return stored;

			pending = true;
		}
		if (pending) {
			const enqueued = await enqueueSync({
				toolkit: data.toolkit,
				indexKey: index.key,
				job: data.job,
			});
			if (enqueued.error) return enqueued;
		}
	}

	return { error: undefined, data: undefined };
};

export default recordChange;
