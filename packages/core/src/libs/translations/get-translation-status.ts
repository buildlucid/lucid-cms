import type { TranslationStatus } from "../../types/response.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import countWords from "./count-words.js";
import type { ContentInput } from "./list-content-fields.js";
import listTranslationItems from "./list-translation-items.js";
import readTranslationState from "./read-translation-state.js";

/** How document content's translations into each locale other than the default compare with its source text. */
const getTranslationStatus = (props: {
	collection: CollectionBuilder;
	localization: ResolvedCollectionLocalization;
	content: ContentInput;
}): TranslationStatus[] => {
	if (!props.localization.enabled) return [];

	const items = listTranslationItems(props);
	const defaultLocale = props.localization.defaultLocale;

	return props.localization.locales
		.filter((locale) => locale !== defaultLocale)
		.map((locale) => {
			const status: TranslationStatus = {
				locale,
				fields: items.length,
				missing: 0,
				outdated: 0,
				byPerson: 0,
				byPersonOutdated: 0,
				words: { update: 0, overwrite: 0 },
			};

			for (const item of items) {
				const words = countWords(item.source);
				status.words.overwrite += words;

				const state = readTranslationState(item, locale);
				if (state === "missing") status.missing++;
				if (state === "outdated") status.outdated++;
				if (state === "byPerson" || state === "byPersonOutdated") {
					status.byPerson++;
				}
				if (state === "byPersonOutdated") status.byPersonOutdated++;
				if (state === "missing" || state === "outdated") {
					status.words.update += words;
				}
			}

			return status;
		});
};

export default getTranslationStatus;
