import { copy } from "@lucidcms/core";
import {
	isCollectionFieldLocalized,
	resolveCollectionLocalization,
} from "@lucidcms/core/extension";
import type {
	CollectionDefinition,
	ResolvedLucidConfig,
	ServiceResponse,
} from "@lucidcms/core/types";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import resolveSeoLocalized from "../resolve-seo-localized.js";

/** A collection the sitemap lists, with where its paths and SEO fields are stored. */
export type SitemapTarget = {
	collection: CollectionDefinition;
	brickKey: string;
	/** The routing field that holds each page's path. */
	pathField: string;
	/**
	 * How the collection stores language versions, or null when it isn't localized. `locales` are
	 * the ones it supports now. Localized paths make each locale its own page. Localized SEO fields
	 * are read in the path's locale, or in the default locale when paths are shared.
	 */
	localization: {
		locales: string[];
		defaultLocale: string;
		paths: boolean;
		seo: boolean;
	} | null;
};

/**
 * Finds the collections to list from the final config, as plugins such as pages may add routing
 * after this one. Collections without routing are skipped, unless `sitemap.collections` names them.
 */
const resolveSitemapTargets = (
	config: Pick<ResolvedLucidConfig, "collections" | "localization">,
	options: SeoPluginOptionsInternal,
): Awaited<ServiceResponse<SitemapTarget[]>> => {
	const named =
		options.sitemap === false ? undefined : options.sitemap.collections;
	const targets: SitemapTarget[] = [];

	for (const target of options.collections) {
		if (named && !named.includes(target.key)) continue;
		const collection = config.collections.find(
			(item) => item.key === target.key,
		);
		if (!collection) continue;

		const routing = collection.config.routing;
		if (!routing) {
			if (!named) continue;
			return {
				error: {
					type: "basic",
					status: 500,
					message: copy("server:plugin.seo.sitemap.routing.missing", {
						data: { collection: collection.key },
					}),
				},
				data: undefined,
			};
		}

		const localization = resolveCollectionLocalization({
			collection,
			localization: config.localization,
		});
		const pathField = collection.fields.get(routing.field);
		targets.push({
			collection,
			brickKey: target.brickKey,
			pathField: routing.field,
			localization: localization.enabled
				? {
						locales: localization.locales,
						defaultLocale: localization.defaultLocale,
						paths:
							pathField !== undefined &&
							isCollectionFieldLocalized(localization, pathField),
						seo: resolveSeoLocalized(target, collection),
					}
				: null,
		});
	}

	return { error: undefined, data: targets };
};

export default resolveSitemapTargets;
