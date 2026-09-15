import type { InternalDocumentField } from "@types";
import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";

/** Creates a field with the default and localization shape defined by its collection config. */
export const createInternalField = (props: {
	fieldConfig: CollectionDataFieldConfig;
	locales: string[];
	collectionLocalized: boolean;
}): InternalDocumentField => {
	const newField: InternalDocumentField = {
		key: props.fieldConfig.key,
		type: props.fieldConfig.type,
	};

	if (props.fieldConfig.type !== "repeater") {
		if (
			props.fieldConfig.localized === true &&
			props.collectionLocalized === true
		) {
			newField.translations = {};

			for (const locale of props.locales) {
				newField.translations[locale] = props.fieldConfig.default;
			}
		} else {
			newField.value = props.fieldConfig.default;
		}
	}

	return newField;
};

/** Recursively adds configured fields missing from a brick and reports whether its structure changed. */
export const ensureFieldsForConfigs = (props: {
	fields: InternalDocumentField[];
	fieldConfigs: CollectionFieldConfig[];
	locales: string[];
	collectionLocalized: boolean;
}): boolean => {
	let fieldsAdded = false;
	const dataFieldConfigs = flattenStructuralScopeConfigs(props.fieldConfigs);
	const fieldsByKey = new Map(props.fields.map((field) => [field.key, field]));

	for (const fieldConfig of dataFieldConfigs) {
		let field = fieldsByKey.get(fieldConfig.key);

		if (!field) {
			field = createInternalField({
				fieldConfig,
				locales: props.locales,
				collectionLocalized: props.collectionLocalized,
			});
			props.fields.push(field);
			fieldsByKey.set(field.key, field);
			fieldsAdded = true;
		}

		if (fieldConfig.type !== "repeater" || field.type !== "repeater") continue;

		for (const group of field.groups ?? []) {
			fieldsAdded =
				ensureFieldsForConfigs({
					fields: group.fields,
					fieldConfigs: fieldConfig.fields,
					locales: props.locales,
					collectionLocalized: props.collectionLocalized,
				}) || fieldsAdded;
		}
	}

	return fieldsAdded;
};
