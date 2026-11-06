import { fieldHooks } from "../collection/custom-fields/registered-fields.js";
import type { FieldTranslation } from "../collection/custom-fields/types.js";
import type { ResolvedCollectionLocalization } from "../collection/helpers/resolve-collection-localization.js";
import type { ContentField } from "./list-content-fields.js";

/** The field type's translation, when the field is localized and not opted out of translation. */
const getFieldTranslation = (
	localization: Pick<ResolvedCollectionLocalization, "enabled">,
	entry: Pick<ContentField, "instance">,
): FieldTranslation | null => {
	if (!localization.enabled || !entry.instance.localizedEnabled) return null;

	const config = entry.instance.config;
	if ("translate" in config && config.translate === false) return null;

	return fieldHooks[entry.instance.type].translation ?? null;
};

export default getFieldTranslation;
