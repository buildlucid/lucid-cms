import type { TranslationChange } from "../../types/response.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import hashTranslationText from "./hash-translation-text.js";
import { type ContentInput, contentFieldId } from "./list-content-fields.js";
import listTranslationItems from "./list-translation-items.js";
import readTranslationState from "./read-translation-state.js";

/**
 * Applies translations and source records to a content copy. Without `overwrite`, preserves
 * translations edited since submission. Rebuilds values from current content to retain unrelated
 * edits, such as link URLs.
 */
const applyTranslationChanges = <T extends ContentInput>(props: {
	collection: CollectionBuilder;
	localization: ResolvedCollectionLocalization;
	content: T;
	changes: readonly TranslationChange[];
	overwrite: boolean;
}): T => {
	const content = structuredClone(props.content);
	const items = new Map(
		listTranslationItems({
			collection: props.collection,
			localization: props.localization,
			content,
		}).map((item) => [contentFieldId(item.entry), item]),
	);

	for (const change of props.changes) {
		const item = items.get(contentFieldId(change));
		if (!item) continue;

		const state = readTranslationState(item, change.locale);
		if (!props.overwrite && state !== "missing" && state !== "outdated") {
			continue;
		}

		const translated = item.translation.read(change.value);
		if (!translated || !props.localization.enabled) continue;

		const field = item.entry.field;
		const value = item.entry.instance.normalizeInputValue(
			item.translation.write(translated.text, {
				source: field.translations?.[props.localization.defaultLocale],
				current: field.translations?.[change.locale],
			}),
		);
		const valueText = item.translation.read(value);
		if (!valueText) continue;

		field.translations = { ...field.translations, [change.locale]: value };
		field.translationSources = {
			...field.translationSources,
			[change.locale]: {
				...change.source,
				output: hashTranslationText(valueText),
			},
		};
	}

	return content;
};

export default applyTranslationChanges;
