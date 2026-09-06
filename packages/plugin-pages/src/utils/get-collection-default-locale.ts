import { resolveCollectionLocalization } from "@lucidcms/core/extension";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";

/** Resolves the locale assigned to unlabelled content when reading this collection. */
const getCollectionDefaultLocale = (
	config: ResolvedLucidConfig,
	collectionKey: string,
) => {
	const collection = config.collections.find(
		(collection) => collection.key === collectionKey,
	);
	if (!collection) return null;
	const localization = resolveCollectionLocalization({
		collection,
		localization: config.localization,
	});
	return localization.enabled ? localization.defaultLocale : null;
};
export default getCollectionDefaultLocale;
