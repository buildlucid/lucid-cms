import T from "./translations/index.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/index.js";
import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import { logger } from "@lucidcms/core";
import { registerFields, pluginOptions } from "./services/index.js";
import {
	beforeUpsertHandler,
	afterUpsertHandler,
	beforeDeleteHandler,
	versionPromoteHandler,
} from "./services/hooks/index.js";

const plugin: LucidPluginOptions<PluginOptions> = async (config, plugin) => {
	const options = pluginOptions(plugin);

	for (const collectionConfig of options.collections) {
		const collectionInstance = config.collections.find(
			(c) => c.key === collectionConfig.collectionKey,
		);
		if (!collectionInstance) {
			logger("warn", {
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

	config.hooks.push({
		service: "documents",
		event: "beforeUpsert",
		handler: beforeUpsertHandler(options),
	});
	config.hooks.push({
		service: "documents",
		event: "afterUpsert",
		handler: afterUpsertHandler(options),
	});
	config.hooks.push({
		service: "documents",
		event: "beforeDelete",
		handler: beforeDeleteHandler(options),
	});
	config.hooks.push({
		service: "documents",
		event: "versionPromote",
		handler: versionPromoteHandler(options),
	});

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		config: config,
	};
};

export default plugin;
