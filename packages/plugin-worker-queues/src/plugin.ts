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
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-worker-queues/translations");
			draft.queue.adapter = workerQueueAdapter(pluginOptions ?? {});
		},
	};
};

export default plugin;
