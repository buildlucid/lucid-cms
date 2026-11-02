import type { CoreToolkit, ServiceFn } from "@lucidcms/core/types";
import type { SyncJob } from "../jobs/types.js";
import rebuild from "../toolkit/rebuild/index.js";
import type { ResolvedOptions } from "../types.js";

/** Queues a rebuild of every index, stopping at the first that can't be queued. Pending rebuilds are resumed. */
const queueRebuilds: ServiceFn<
	[{ options: ResolvedOptions; job: SyncJob; toolkit: CoreToolkit }],
	Array<{ index: string; rebuildId: string; jobId: string }>
> = async (context, data) => {
	const queued = [];
	for (const { key } of data.options.indexes) {
		const rebuilt = await rebuild(context, { index: key }, data);
		if (rebuilt.error) return rebuilt;

		queued.push({ index: key, ...rebuilt.data });
	}

	return { error: undefined, data: queued };
};

export default queueRebuilds;
