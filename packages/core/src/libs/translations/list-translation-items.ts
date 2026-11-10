import type {
	FieldTranslation,
	TranslationText,
} from "../collection/custom-fields/types.js";
import type CollectionDefinition from "../collection/definitions/collection/index.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import getFieldTranslation from "./get-field-translation.js";
import hashTranslationText from "./hash-translation-text.js";
import listContentFields, {
	type ContentField,
	type ContentInput,
} from "./list-content-fields.js";

/** A translated field with text in the default locale to translate from. */
export type TranslationItem = {
	entry: ContentField;
	translation: FieldTranslation;
	source: TranslationText;
	sourceHash: string;
	/** A hash of the field's configured default text, which editors show in empty translations. */
	defaultHash?: string;
};

/** Lists the translated fields in document content that have source text in the default locale. */
const listTranslationItems = (props: {
	collection: CollectionDefinition;
	localization: ResolvedCollectionLocalization;
	content: ContentInput;
}): TranslationItem[] => {
	if (!props.localization.enabled) return [];
	const defaultLocale = props.localization.defaultLocale;

	return listContentFields(props.collection, props.content).flatMap((entry) => {
		const translation = getFieldTranslation(props.localization, entry);
		if (!translation) return [];

		const source = translation.read(entry.field.translations?.[defaultLocale]);
		if (!source) return [];

		const defaultText = translation.read(entry.instance.defaultValue);
		return [
			{
				entry,
				translation,
				source,
				sourceHash: hashTranslationText(source),
				defaultHash: defaultText ? hashTranslationText(defaultText) : undefined,
			},
		];
	});
};

export default listTranslationItems;
