import { LucidError, logger } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import getCollectionVersion from "./get-collection-version.js";

export type SiteFunctionsContext = {
	locales: ReadonlySet<string>;
	defaultLocale: string;
	getVersion: (collectionKey: string, requested?: string) => string | null;
};

const createSiteFunctionsContext = (
	config: ResolvedLucidConfig,
	siteEnvironment: string | null,
): SiteFunctionsContext => {
	const codes = config.localization.locales.map((locale) => locale.code);

	return {
		locales: new Set(codes),
		defaultLocale: config.localization.defaultLocale ?? codes[0] ?? "en",
		getVersion: (collectionKey, requested) => {
			const collection = config.collections.find(
				(item) => item.key === collectionKey,
			);
			if (!collection) {
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: `There is no '${collectionKey}' collection.`,
				});
			}
			if (requested !== undefined) return requested;

			const version = getCollectionVersion(collection, siteEnvironment);
			if (version === null) {
				logger.warn({
					scope: PLUGIN_KEY,
					event: "plugin-site.collection.not-on-site",
					dedupeKey: `${PLUGIN_KEY}:not-on-site:${collectionKey}`,
					message: `The '${collectionKey}' collection has no '${siteEnvironment}' environment, so the site shows none of its documents.`,
				});
			}
			return version;
		},
	};
};

export default createSiteFunctionsContext;
