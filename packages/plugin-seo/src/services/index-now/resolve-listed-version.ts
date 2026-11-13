import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";
import getListedVersion from "../sitemap/get-listed-version.js";
import resolveSitemapEnvironment from "../sitemap/resolve-sitemap-environment.js";
import resolveSitemapTargets from "../sitemap/resolve-sitemap-targets.js";

/**
 * The version the sitemap lists of a collection's documents, in the sitemap's environment, or null
 * when the sitemap doesn't list the collection. `checkCompatibility` has already checked both
 * resolve, so an error here also means not listed.
 */
const resolveListedVersion = (
	config: Pick<ResolvedLucidConfig, "collections" | "localization">,
	options: SeoPluginOptionsInternal,
	collectionKey: string,
): string | null => {
	if (options.sitemap === false) return null;

	const targets = resolveSitemapTargets(config, options);
	const target = targets.data?.find(
		(item) => item.collection.key === collectionKey,
	);
	if (!target) return null;

	const environment = resolveSitemapEnvironment(
		config.collections,
		options.sitemap.environment,
	);
	if (environment.error) return null;

	return getListedVersion(target.collection, environment.data);
};

export default resolveListedVersion;
