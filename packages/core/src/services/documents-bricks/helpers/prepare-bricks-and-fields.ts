import type { CollectionBuilder } from "../../../builders.js";
import type CustomField from "../../../libs/custom-fields/custom-field.js";
import type { BrickSchema } from "../../../schemas/collection-bricks.js";
import type { FieldSchemaType, FieldTypes } from "../../../types.js";

/**
 * Processes fields to remove any that don't exist in the custom fields.
 * Processes recursively for repeater fields with nested groups.
 */
const processFields = (
	fields: Array<FieldSchemaType>,
	customFields: Map<string, CustomField<FieldTypes>>,
): Array<FieldSchemaType> => {
	return fields
		.filter((field) => customFields.has(field.key))
		.map((field) => {
			const processedField = { ...field };

			if (field.type === "repeater" && field.groups) {
				processedField.groups = field.groups.map((group) => ({
					...group,
					fields: processFields(group.fields, customFields),
				}));
			}

			return processedField;
		});
};

/**
 * Prepares bricks and fields by removing invalid fields that don't exist in custom fields.
 */
const prepareBricksAndFields = (params: {
	collection: CollectionBuilder;
	bricks?: Array<BrickSchema>;
	fields?: Array<FieldSchemaType>;
}) => {
	// Process collection fields
	const preparedFields = params.fields
		? processFields(params.fields, params.collection.fields)
		: undefined;

	// Process brick fields
	const preparedBricks = params.bricks
		? params.bricks.map((brick) => {
				const brickDefinition = params.collection.brickInstances.find(
					(b) => b.key === brick.key,
				);
				if (!brickDefinition || !brick.fields) return brick;

				// Process fields for this brick
				const processedFields = processFields(
					brick.fields,
					brickDefinition.fields,
				);

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
