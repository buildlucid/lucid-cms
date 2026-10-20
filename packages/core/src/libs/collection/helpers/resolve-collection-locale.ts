import type { ResolvedCollectionLocalization } from "./resolve-collection-localization.js";

/** Returns the requested collection locale when supported, its default otherwise, or null when localization is disabled. */
const resolveCollectionLocale = (
	localization: ResolvedCollectionLocalization,
	requested: string,
): string | null => {
	if (!localization.enabled) return null;
	return localization.locales.includes(requested)
		? requested
		: localization.defaultLocale;
};

export default resolveCollectionLocale;
