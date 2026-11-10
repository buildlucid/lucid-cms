import type CollectionDefinition from "../collection/definitions/collection/index.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import type { ContentInput } from "./list-content-fields.js";
import listTranslationItems from "./list-translation-items.js";
import readTranslationState, {
	type TranslationState,
} from "./read-translation-state.js";

/** Each translated field's state in every locale other than the default, for reporting what translation needs. */
const listTranslationStates = (props: {
	collection: CollectionDefinition;
	localization: ResolvedCollectionLocalization;
	content: ContentInput;
}): Array<{
	locale: string;
	fields: Array<{
		brick: string | null;
		path: string[];
		state: TranslationState;
	}>;
}> => {
	if (!props.localization.enabled) return [];

	const items = listTranslationItems(props);
	return props.localization.locales
		.filter((locale) => locale !== props.localization.defaultLocale)
		.map((locale) => ({
			locale,
			fields: items.map((item) => ({
				brick: item.entry.brick,
				path: item.entry.path,
				state: readTranslationState(item, locale),
			})),
		}));
};

export default listTranslationStates;
