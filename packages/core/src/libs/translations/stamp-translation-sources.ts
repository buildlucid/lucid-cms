import type { TranslationSource } from "../../types/response.js";
import type CollectionDefinition from "../collection/definitions/collection/index.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import getFieldTranslation from "./get-field-translation.js";
import hashTranslationText from "./hash-translation-text.js";
import listContentFields, {
	type ContentInput,
	contentFieldId,
} from "./list-content-fields.js";

/**
 * Stamps translation sources before saving. Preserves matching AI output, checked human sources
 * and unchanged values. Other edits become human translations of current source text, excluding
 * display defaults.
 */
const stampTranslationSources = (props: {
	collection: CollectionDefinition;
	localization: ResolvedCollectionLocalization;
	/** The content being replaced, or null for new content. */
	previous: ContentInput | null;
	next: ContentInput;
}): void => {
	const previous = new Map(
		listContentFields(props.collection, props.previous ?? {}).map((entry) => [
			contentFieldId(entry),
			entry,
		]),
	);

	for (const entry of listContentFields(props.collection, props.next)) {
		const translation = getFieldTranslation(props.localization, entry);
		if (!translation || !props.localization.enabled) {
			delete entry.field.translationSources;
			continue;
		}

		const defaultLocale = props.localization.defaultLocale;
		const sourceText = translation.read(
			entry.field.translations?.[defaultLocale],
		);
		const sourceHash = sourceText ? hashTranslationText(sourceText) : null;
		const defaultText = translation.read(entry.instance.defaultValue);
		const defaultHash = defaultText ? hashTranslationText(defaultText) : null;
		const stored = previous.get(contentFieldId(entry))?.field;
		const sources: Record<string, TranslationSource> = {};

		for (const locale of props.localization.locales) {
			if (locale === defaultLocale) continue;

			const text = translation.read(entry.field.translations?.[locale]);
			if (!text) continue;

			const valueHash = hashTranslationText(text);
			const incoming = entry.field.translationSources?.[locale];
			if (incoming?.origin === "ai" && incoming.output === valueHash) {
				sources[locale] = incoming;
				continue;
			}
			if (
				incoming?.origin === "person" &&
				sourceHash !== null &&
				incoming.source === sourceHash
			) {
				sources[locale] = { source: sourceHash, origin: "person" };
				continue;
			}

			const storedText = translation.read(stored?.translations?.[locale]);
			if (storedText && hashTranslationText(storedText) === valueHash) {
				const storedSource = stored?.translationSources?.[locale];
				if (storedSource) sources[locale] = storedSource;
				continue;
			}

			if (sourceHash !== null && valueHash !== defaultHash) {
				sources[locale] = { source: sourceHash, origin: "person" };
			}
		}

		if (Object.keys(sources).length > 0) {
			entry.field.translationSources = sources;
		} else {
			delete entry.field.translationSources;
		}
	}
};

export default stampTranslationSources;
