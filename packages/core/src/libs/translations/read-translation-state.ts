import hashTranslationText from "./hash-translation-text.js";
import type { TranslationItem } from "./list-translation-items.js";

/**
 * Where a field's translation into one locale stands against its source text.
 * Translations without a recorded source count as a person's, except ones
 * that only hold the field's default, which count as missing.
 */
export type TranslationState =
	| "missing"
	| "current"
	| "outdated"
	| "byPerson"
	| "byPersonOutdated";

/** Reads a translated field's state in a locale. */
const readTranslationState = (
	item: TranslationItem,
	locale: string,
): TranslationState => {
	const text = item.translation.read(item.entry.field.translations?.[locale]);
	if (!text) return "missing";

	const valueHash = hashTranslationText(text);
	const source = item.entry.field.translationSources?.[locale];
	if (source === undefined) {
		return valueHash === item.defaultHash ? "missing" : "byPerson";
	}
	if (source.origin === "ai" && source.output === valueHash) {
		return source.source === item.sourceHash ? "current" : "outdated";
	}
	return source.source === item.sourceHash ? "byPerson" : "byPersonOutdated";
};

export default readTranslationState;
