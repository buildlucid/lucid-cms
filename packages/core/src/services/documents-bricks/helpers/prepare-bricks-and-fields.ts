import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type CustomField from "../../../libs/custom-fields/custom-field.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { Config, FieldInputSchema, FieldTypes } from "../../../types.js";

/**
 * - Processes fields to remove any that don't exist in the custom fields.
 * - Processes recursively for repeater fields with nested groups.
 * - Based on collection and field translation support, sort out the fields translations/value props and fill missing translations with default values
 */
const processFields = (props: {
	collection: CollectionBuilder;
	fields: Array<FieldInputSchema>;
	customFields: Map<string, CustomField<FieldTypes>>;
	localization: Config["localization"];
}): Array<FieldInputSchema> => {
	return props.fields
		.filter((field) => props.customFields.has(field.key))
		.map((field) => {
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			const cfInstance = props.customFields.get(field.key)!;
			const processedField = { ...field };

			if (field.type === "repeater" && field.groups) {
				processedField.groups = field.groups.map((group) => ({
					...group,
					fields: processFields({
						collection: props.collection,
						fields: group.fields,
						customFields: props.customFields,
						localization: props.localization,
					}),
				}));
			}

			// if collection uses translations and the field supports translations
			if (
				props.collection.getData.config.useTranslations &&
				cfInstance?.translationsEnabled
			) {
				// if processField.value is given only and no translations key - add the value to the translations object with the locale object key being the default locale
				if (
					processedField.value !== undefined &&
					!processedField.translations
				) {
					processedField.translations = {
						[props.localization.defaultLocale]: processedField.value,
					};
					processedField.value = undefined;
				}
			} else {
				// if processField.translations is given, take the default locale translation value and set it as the processField.value
				if (processedField.translations && processedField.value === undefined) {
					const translationValue =
						processedField.translations[props.localization.defaultLocale];
					processedField.value =
						translationValue !== undefined
							? translationValue
							: cfInstance.defaultValue;
					processedField.translations = undefined;
				}
			}

			// if processField.translations is set, ensure that each supported locale has a key. Use the cfInstance.defaultValue for missing locales
			if (processedField.translations) {
				for (const locale of props.localization.locales) {
					const localeCode = locale.code;
					//* if null its intentionally empty - no default should be set
					if (processedField.translations[localeCode] === undefined) {
						processedField.translations[localeCode] = cfInstance.defaultValue;
					}
				}
			}

			return processedField;
		});
};

/**
 * Prepares bricks and fields by removing invalid fields that don't exist in custom fields.
 */
const prepareBricksAndFields = (props: {
	collection: CollectionBuilder;
	bricks?: Array<BrickInputSchema>;
	fields?: Array<FieldInputSchema>;
	localization: Config["localization"];
}) => {
	// Process collection fields
	const preparedFields = props.fields
		? processFields({
				collection: props.collection,
				fields: props.fields,
				customFields: props.collection.fields,
				localization: props.localization,
			})
		: undefined;

	// Process brick fields
	const preparedBricks = props.bricks
		? props.bricks.map((brick) => {
				const brickDefinition = props.collection.brickInstances.find(
					(b) => b.key === brick.key,
				);
				if (!brickDefinition || !brick.fields) return brick;

				// Process fields for this brick
				const processedFields = processFields({
					collection: props.collection,
					fields: brick.fields,
					customFields: brickDefinition.fields,
					localization: props.localization,
				});

				return {
					...brick,
					fields: processedFields,
				};
			})
		: undefined;

	return {
		preparedBricks,
		preparedFields,
	};
};

export default prepareBricksAndFields;
