import type { MediaTranslationMap } from "../../../../types/response.js";

/** Returns media text for one locale, treating unassigned strings as shared across all locales. */
const translateText = (
	value: MediaTranslationMap,
	locale: string | null,
): string | null => {
	if (typeof value === "string" || value === null) return value;
	if (locale === null) return null;
	return value[locale] ?? null;
};

export default translateText;
