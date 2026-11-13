import { LucidError } from "@lucidcms/core";
import type { CollectionDefinition } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import type { SeoPluginOptionsInternal } from "./parse-plugin-options.js";
import resolveSeoLocalized from "./resolve-seo-localized.js";

/** Resolve and check every target before mutating the configuration. */
const resolvePluginOptions = (
	options: SeoPluginOptionsInternal,
	collections: CollectionDefinition[],
) =>
	options.collections.map((target) => {
		const collection = collections.find((item) => item.key === target.key);
		if (!collection) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `SEO collection '${target.key}' was not found.`,
			});
		}

		if (
			collection.brickInstances.some((brick) => brick.key === target.brickKey)
		) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Brick '${target.brickKey}' already exists on '${target.key}'. Remove it or choose another SEO brickKey.`,
			});
		}

		return {
			collection,
			brickKey: target.brickKey,
			localized: resolveSeoLocalized(target, collection),
		};
	});
export default resolvePluginOptions;
