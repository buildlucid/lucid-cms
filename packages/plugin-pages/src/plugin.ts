import { logger } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import { checkRouteSegments } from "./services/checks/index.js";
import {
	afterFetchHandler,
	afterUpsertHandler,
	beforeDeleteHandler,
	beforeUpsertHandler,
	versionPromoteHandler,
} from "./services/hooks/index.js";
import { pluginOptions, registerFields } from "./services/index.js";
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPlugin<PluginOptions> = (plugin) => {
	const options = pluginOptions(plugin);

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-pages/translations");
			const configuredCollections = [];

			for (const collectionConfig of options.collections) {
				const collectionInstance = draft.collections.find(
					(c) => c.key === collectionConfig.key,
				);
				if (!collectionInstance) {
					logger.warn({
						message: "Pages collection was not found",
						scope: PLUGIN_KEY,
						data: {
							collection: collectionConfig.key,
						},
					});
					continue;
				}

				registerFields(collectionInstance, collectionConfig);
				collectionInstance.config.routing = "fullSlug";
				configuredCollections.push({ collectionConfig, collectionInstance });

				if (!collectionInstance.config.hooks) {
					collectionInstance.config.hooks = [];
				}
			}

			for (const {
				collectionConfig,
				collectionInstance,
			} of configuredCollections) {
				checkRouteSegments({
					collection: collectionInstance,
					collections: draft.collections,
					config: collectionConfig,
				});
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
					event: "afterFetch",
					handler: afterFetchHandler(options),
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
