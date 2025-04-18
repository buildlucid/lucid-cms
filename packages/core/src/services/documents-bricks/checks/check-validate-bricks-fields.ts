import T from "../../../translations/index.js";
import logger from "../../../utils/logging/index.js";
import fetchValidationData, {
	type ValidationData,
} from "../helpers/fetch-validation-data.js";
import type { FieldTypes } from "../../../libs/custom-fields/types.js";
import type BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { BrickSchema } from "../../../schemas/collection-bricks.js";
import type {
	BrickError,
	FieldErrors,
	FieldSchemaType,
	GroupError,
} from "../../../types.js";
import type CustomField from "../../../libs/custom-fields/custom-field.js";

const checkValidateBricksFields: ServiceFn<
	[
		{
			bricks: Array<BrickSchema>;
			fields: Array<FieldSchemaType>;
			collection: CollectionBuilder;
		},
	],
	undefined
> = async (context, data) => {
	const relationDataRes = await fetchValidationData(context, data);
	if (relationDataRes.error) return relationDataRes;

	const brickErrors = validateBricks(
		data.bricks,
		data.collection,
		relationDataRes.data,
	);
	const fieldErrors = recursiveFieldValidate(
		data.fields,
		data.collection,
		relationDataRes.data,
	);

	if (brickErrors.length > 0 || fieldErrors.length > 0) {
		return {
			data: undefined,
			error: {
				type: "basic",
				name: T("field_validation_error_name"),
				message: T("field_validation_error_message"),
				status: 400,
				errorResponse: {
					body: {
						bricks: brickErrors,
						fields: fieldErrors,
					},
				},
			},
		};
	}

	return {
		data: undefined,
		error: undefined,
	};
};

/**
 * Loops over bricks and runs validation against their fields recursively and return errors
 */
const validateBricks = (
	bricks: Array<BrickSchema>,
	collection: CollectionBuilder,
	validationData: ValidationData,
): Array<BrickError> => {
	const errors: BrickError[] = [];

	for (const brick of bricks) {
		let instance = undefined;

		switch (brick.type) {
			case "builder": {
				instance = collection.config.bricks?.builder?.find(
					(b) => b.key === brick.key,
				);
				break;
			}
			case "fixed": {
				instance = collection.config.bricks?.fixed?.find(
					(b) => b.key === brick.key,
				);
				break;
			}
		}

		if (!instance) {
			logger("error", {
				message: T("error_saving_page_brick_couldnt_find_brick_config", {
					key: brick.key || "",
				}),
			});
			return errors;
		}

		const fieldErrors = recursiveFieldValidate(
			brick.fields || [],
			instance,
			validationData,
		);
		if (fieldErrors.length === 0) continue;

		errors.push({
			id: brick.id,
			key: brick.key,
			order: brick.order,
			fields: fieldErrors,
		});
	}

	return errors;
};

/**
 * Recursively validate fields and return errors
 */
const recursiveFieldValidate = (
	fields: Array<FieldSchemaType>,
	instance: CollectionBuilder | BrickBuilder,
	validationData: ValidationData,
	parentRepeaterKey?: string,
) => {
	const errors: FieldErrors[] = [];

	//*  validate all provided fields
	for (const field of fields) {
		const fieldInstance = instance.fields.get(field.key);
		if (!fieldInstance) {
			errors.push({
				key: field.key,
				message: T("cannot_find_field_in_collection_or_brick"),
			});
			continue;
		}

		//* handle repeater fields separately with recursive validation
		if (field.type === "repeater" && field.groups) {
			const groupErrors: Array<GroupError> = [];

			// validates the repeater field and its group length
			const validationResult = fieldInstance.validate({
				type: field.type,
				value: field.groups,
			});
			if (!validationResult.valid) {
				errors.push({
					key: field.key,
					message:
						validationResult.message || T("repeater_field_contains_errors"),
				});
			}

			for (let i = 0; i < field.groups.length; i++) {
				const group = field.groups[i];
				if (!group) continue;

				const groupFieldErrors = recursiveFieldValidate(
					group.fields,
					instance,
					validationData,
					field.key,
				);

				if (groupFieldErrors.length > 0) {
					groupErrors.push({
						id: group.id,
						order: group.order || i,
						fields: groupFieldErrors,
					});
				}
			}

			if (groupErrors.length > 0) {
				errors.push({
					key: field.key,
					message: T("repeater_field_contains_errors"),
					groupErrors: groupErrors,
				});
			}

			continue;
		}

		//* handle regular fields
		const fieldErrors = validateField(field, fieldInstance, validationData);
		if (fieldErrors.length > 0) {
			errors.push(...fieldErrors);
		}
	}

	//* check for required fields that are missing
	const submittedFieldKeys = new Set(fields.map((field) => field.key));
	instance.fields.forEach((fieldInstance, key) => {
		if (submittedFieldKeys.has(key)) return;

		//* skip fields that belong to a different repeater context
		const fieldRepeaterParent = fieldInstance.repeater;
		if (
			(fieldRepeaterParent && fieldRepeaterParent !== parentRepeaterKey) ||
			(!fieldRepeaterParent && parentRepeaterKey)
		) {
			return;
		}

		// @ts-expect-error: not all custom fields have validation config
		if (fieldInstance.config?.validation?.required) {
			errors.push({
				key,
				message: T("field_is_required"),
			});
		}
	});

	return errors;
};

/**
 * Helper function to get the appropriate relation data based on field type
 */
const getRelationData = (
	fieldType: FieldTypes,
	validationData: ValidationData,
) => {
	switch (fieldType) {
		case "media":
			return validationData.media;
		case "user":
			return validationData.users;
		case "document":
			return validationData.documents;
		default:
			return undefined;
	}
};

/**
 * Validates a single field, handling both direct values and translations
 */
export const validateField = (
	field: FieldSchemaType,
	instance: CustomField<FieldTypes>,
	validationData: ValidationData,
): FieldErrors[] => {
	const errors: FieldErrors[] = [];
	const relationData = getRelationData(field.type, validationData);

	//* handle fields with translations
	if (field.translations) {
		for (const localeCode in field.translations) {
			const value = field.translations[localeCode];
			const validationResult = instance.validate({
				type: field.type,
				value,
				relationData,
			});

			if (!validationResult.valid) {
				errors.push({
					key: field.key,
					localeCode,
					message:
						validationResult.message ||
						T("an_unknown_error_occurred_validating_the_field"),
				});
			}
		}
	}
	//* handle direct value fields
	else {
		const validationResult = instance.validate({
			type: field.type,
			value: field.value,
			relationData,
		});

		if (!validationResult.valid) {
			errors.push({
				key: field.key,
				message:
					validationResult.message ||
					T("an_unknown_error_occurred_validating_the_field"),
			});
		}
	}

	return errors;
};

export default checkValidateBricksFields;
