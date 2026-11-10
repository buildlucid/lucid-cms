import { definePlugin, logger } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import rebuildPathsConfig from "./admin/components/RebuildPaths/config.js";
import { PACKAGE_INFO, PLUGIN_KEY } from "./constants.js";
import hookEvents from "./hook-events/index.js";
import createRebuildPathsJob from "./jobs/rebuild-paths.js";
import pathHistoryMigration from "./migrations/1789000000000-pages-path-history.js";
import rebuildPathsRoute from "./routes/rebuild-paths.js";
import { checkRouteSegments } from "./services/checks/index.js";
import {
	afterRestoreHandler,
	afterUpsertHandler,
	beforeDeleteHandler,
	beforeUnpublishHandler,
	beforeUpsertHandler,
	requestCheckHandler,
	requestCompletedHandler,
	requestDocumentRemovedHandler,
	versionCaptureHandler,
	versionPromoteHandler,
} from "./services/hooks/index.js";
import pluginOptions from "./services/plugin-options.js";
import registerRedirects from "./services/redirects/register-redirects.js";
import registerAdminSlots from "./services/register-admin-slots.js";
import registerFields from "./services/register-fields.js";
import toolkit from "./toolkit/index.js";
import type { PluginOptions } from "./types/types.js";

/** Adds page routing fields, redirects, maintenance hooks, path rebuilds, toolkit helpers and hook events. */
const plugin: LucidPlugin<PluginOptions> = (plugin) => {
	const options = pluginOptions(plugin);
	const rebuildPathsJob = createRebuildPathsJob(options);

	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		toolkit,
		hookEvents,
		sources: { translations: ["@lucidcms/pages/translations"] },
		configure: (draft) => {
			draft.migrations.definitions.push({
				name: "1789000000000-pages-path-history",
				migration: pathHistoryMigration,
			});
			draft.jobs.definitions.push(rebuildPathsJob);
			draft.http.routes.push(rebuildPathsRoute(rebuildPathsJob));
			draft.admin.slots.push(rebuildPathsConfig());

			const configuredCollections = [];

			for (const collectionConfig of options.collections) {
				const collectionInstance = draft.collections.find(
					(c) => c.key === collectionConfig.key,
				);
				if (!collectionInstance) {
					logger.warn({
						message: "Pages collection was not found",
						owner: PLUGIN_KEY,
						data: {
							collection: collectionConfig.key,
						},
					});
					continue;
				}

				registerFields(collectionInstance, collectionConfig);
				draft.admin.slots.push(...registerAdminSlots(collectionConfig));
				collectionInstance.config.routing = { field: "path" };
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

			if (options.redirects !== false && configuredCollections.length > 0) {
				registerRedirects({
					draft,
					options,
					redirects: options.redirects,
					collections: configuredCollections,
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
					event: "beforeDelete",
					handler: beforeDeleteHandler(options),
				});
				draft.hooks.push({
					service: "documents",
					event: "beforeUnpublish",
					handler: beforeUnpublishHandler(options),
				});
				draft.hooks.push({
					service: "documents",
					event: "afterVersionPromote",
					handler: versionPromoteHandler(options),
				});
				draft.hooks.push({
					service: "documents",
					event: "afterVersionCapture",
					handler: versionCaptureHandler(options),
				});
				draft.hooks.push({
					service: "documents",
					event: "afterRestore",
					handler: afterRestoreHandler(options),
				});
				draft.hooks.push({
					service: "requests",
					event: "afterCheck",
					handler: requestCheckHandler(options),
				});
				draft.hooks.push({
					service: "requests",
					event: "afterComplete",
					handler: requestCompletedHandler(options),
				});
				draft.hooks.push({
					service: "requests",
					event: "afterDocumentRemove",
					handler: requestDocumentRemovedHandler(options),
				});
			}
		},
	});
};

export default plugin;
