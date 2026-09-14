import { copy, definePlugin, LucidError } from "@lucidcms/core";
import { resolveCollectionLocalization } from "@lucidcms/core/extension";
import type { LucidPlugin } from "@lucidcms/core/types";
import { LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import createSyncJob from "./jobs/sync.js";
import migration from "./migrations/1788900000000-typesense.js";
import recordChange from "./services/record-change.js";
import toolkit from "./toolkit/index.js";
import type { PluginOptions } from "./types.js";
import pluginOptions from "./utils/plugin-options.js";

/** Keeps configured collection sources in Typesense through durable Lucid jobs. */
const plugin: LucidPlugin<PluginOptions> = (input) => {
	const options = pluginOptions(input);
	const job = createSyncJob(options);

	return definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		sources: { translations: ["@lucidcms/plugin-typesense/translations"] },
		toolkit: toolkit(options, job),
		configure: (draft) => {
			draft.migrations.definitions.push({
				name: "1788900000000-typesense",
				migration,
			});
			draft.jobs.definitions.push(job);
			draft.hooks.push(
				{
					service: "documents",
					event: "afterChange",
					handler: ({ context, toolkit, data, meta }) =>
						recordChange(context, {
							toolkit,
							options,
							job,
							change: {
								kind: "documents",
								collectionKey: meta.collectionKey,
								ids: data.ids,
							},
						}),
				},
				{
					service: "media",
					event: "afterChange",
					handler: ({ context, toolkit, data }) =>
						recordChange(context, {
							toolkit,
							options,
							job,
							change: { kind: "media", ids: data.ids },
						}),
				},
			);
		},
		checkCompatibility: ({ config, translate }) => {
			for (const index of options.indexes) {
				for (const source of index.sources) {
					if (source.kind === "media") {
						if (
							source.locales?.some(
								(locale) =>
									!config.localization.locales.some(
										(enabled) => enabled.code === locale,
									),
							)
						)
							throw new LucidError({
								scope: PLUGIN_KEY,
								message: translate.english(
									copy("server:plugin.typesense.config.locales"),
								),
							});
						continue;
					}
					const collection = config.collections.find(
						(collection) => collection.key === source.collection,
					);
					if (!collection)
						throw new LucidError({
							scope: PLUGIN_KEY,
							message: translate.english(
								copy("server:plugin.typesense.collection.missing"),
							),
							data: { collection: source.collection },
						});
					if (
						source.version !== "latest" &&
						!collection.getData.publishing.targets.some(
							(target) => target.key === source.version,
						)
					) {
						throw new LucidError({
							scope: PLUGIN_KEY,
							message: translate.english(
								copy("server:plugin.typesense.config.version"),
							),
							data: { collection: source.collection, version: source.version },
						});
					}
					const localization = resolveCollectionLocalization({
						localization: config.localization,
						collection,
					});
					if (
						source.locales?.some(
							(locale) => !localization.locales.includes(locale),
						)
					) {
						throw new LucidError({
							scope: PLUGIN_KEY,
							message: translate.english(
								copy("server:plugin.typesense.config.locales"),
							),
							data: { collection: source.collection, locales: source.locales },
						});
					}
				}
			}
		},
	});
};

export default plugin;
