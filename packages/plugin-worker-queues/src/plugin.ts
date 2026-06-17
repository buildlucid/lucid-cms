import type { LucidPlugin } from "@lucidcms/core/types";
import workerQueueAdapter, {
	type WorkerQueueAdapterOptions,
} from "./adapter/index.js";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";

const plugin: LucidPlugin<WorkerQueueAdapterOptions | undefined> = (
	pluginOptions,
) => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-worker-queues/translations");
			if (!draft.queue) {
				draft.queue = {
					adapter: workerQueueAdapter(pluginOptions ?? {}),
				};
			} else {
				draft.queue.adapter = workerQueueAdapter(pluginOptions ?? {});
			}
		},
	};
};

export default plugin;
