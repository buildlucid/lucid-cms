import { LucidError, logger } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import { PLUGIN_KEY } from "../constants.js";
import createFieldTypes, {
	type FieldTypesLookup,
} from "./create-field-types.js";
import getCollectionVersion from "./get-collection-version.js";

export type SiteFunctionsContext = {
	locales: ReadonlySet<string>;
	defaultLocale: string;
	/** The version templates read, warning once when the collection isn't on the site. */
	getVersion: (collectionKey: string, requested?: string) => string | null;
	/** The collection's site version without the warning, for checks across every collection. */
	siteVersion: (collectionKey: string) => string | null;
	/** Field types for a collection, or one of its bricks, so reads can resolve references. */
	fieldTypes: FieldTypesLookup;
};

const createSiteFunctionsContext = (
	config: ResolvedLucidConfig,
	siteEnvironment: string | null,
): SiteFunctionsContext => {
	const codes = config.localization.locales.map((locale) => locale.code);
	const siteVersion = (collectionKey: string) => {
		const collection = config.collections.find(
			(item) => item.key === collectionKey,
		);
		if (!collection) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `There is no '${collectionKey}' collection.`,
			});
		}
		return getCollectionVersion(collection, siteEnvironment);
	};

	return {
		locales: new Set(codes),
		defaultLocale: config.localization.defaultLocale ?? codes[0] ?? "en",
		siteVersion,
		fieldTypes: createFieldTypes(config),
		getVersion: (collectionKey, requested) => {
			const version = siteVersion(collectionKey);
			if (requested !== undefined) return requested;
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
