import T from "./translations/index.js";
import type { LucidPlugin } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";
import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import { logger } from "@lucidcms/core";
import { registerFields, pluginOptions } from "./services/index.js";
import {
	beforeUpsertHandler,
	afterUpsertHandler,
	beforeDeleteHandler,
	versionPromoteHandler,
} from "./services/hooks/index.js";

const plugin: LucidPlugin<PluginOptions> = (plugin) => {
	const options = pluginOptions(plugin);

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			for (const collectionConfig of options.collections) {
				const collectionInstance = draft.collections.find(
					(c) => c.key === collectionConfig.collectionKey,
				);
				if (!collectionInstance) {
					logger.warn({
						message: T("cannot_find_collection", {
							collection: collectionConfig.collectionKey,
						}),
						scope: PLUGIN_KEY,
					});
					continue;
				}

				registerFields(collectionInstance, collectionConfig);

				if (!collectionInstance.config.hooks) {
					collectionInstance.config.hooks = [];
				}
			}

			if (draft.hooks && Array.isArray(draft.hooks)) {
				draft.hooks.push({
					service: "documents",
					event: "beforeUpsert",
					handler: beforeUpsertHandler(options),
				});
				draft.hooks.push({
					service: "documents",
					event: "afterUpsert",
					handler: afterUpsertHandler(options),
				});
				draft.hooks.push({
					service: "documents",
					event: "beforeDelete",
					handler: beforeDeleteHandler(options),
				});
				draft.hooks.push({
					service: "documents",
					event: "versionPromote",
					handler: versionPromoteHandler(options),
				});
			}
		},
	};
};

export default plugin;
