import type { LucidPluginResponse } from "@lucidcms/core/types";
import workerQueueAdapter from "./adapter/index.js";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import type { WorkerQueueAdapterOptions } from "./types.js";

/** Configures Lucid to process jobs in a polling worker thread. */
const plugin = (
	pluginOptions?: WorkerQueueAdapterOptions,
): LucidPluginResponse => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		sources: { translations: ["@lucidcms/plugin-worker-queues/translations"] },
		recipe: (draft) => {
			draft.queue.adapter = workerQueueAdapter(pluginOptions ?? {});
		},
	};
};

export default plugin;
