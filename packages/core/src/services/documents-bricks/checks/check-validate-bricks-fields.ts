import T from "../../../translations/index.js";
import logger from "../../../libs/logger/index.js";
import constants from "../../../constants/constants.js";
import fetchValidationData, {
	type ValidationData,
} from "../helpers/fetch-validation-data.js";
import type { FieldTypes } from "../../../libs/custom-fields/types.js";
import type BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type {
	BrickError,
	FieldError,
	FieldInputSchema,
	GroupError,
} from "../../../types.js";
import type CustomField from "../../../libs/custom-fields/custom-field.js";

const checkValidateBricksFields: ServiceFn<
	[
		{
			bricks: Array<BrickInputSchema>;
			fields: Array<FieldInputSchema>;
			collection: CollectionBuilder;
		},
	],
	undefined
> = async (context, data) => {
	const relationDataRes = await fetchValidationData(context, data);
	if (relationDataRes.error) return relationDataRes;

	const brickErrors = validateBricks({
		bricks: data.bricks,
		collection: data.collection,
		validationData: relationDataRes.data,
		defaultLocale: context.config.localization.defaultLocale,
	});
	const fieldErrors = recursiveFieldValidate({
		fields: data.fields,
		instance: data.collection,
		validationData: relationDataRes.data,
		meta: {
			useTranslations: data.collection.getData.config.useTranslations,
			defaultLocale: context.config.localization.defaultLocale,
		},
	});

	if (brickErrors.length > 0 || fieldErrors.length > 0) {
		return {
			data: undefined,
			error: {
				type: "basic",
				name: T("field_validation_error_name"),
				message: T("field_validation_error_message"),
				status: 400,
				errors: {
					bricks: brickErrors,
					fields: fieldErrors,
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
const validateBricks = (props: {
	bricks: Array<BrickInputSchema>;
	collection: CollectionBuilder;
	validationData: ValidationData;
	defaultLocale: string;
}): Array<BrickError> => {
	const errors: BrickError[] = [];

	for (const brick of props.bricks) {
		let instance = undefined;

		switch (brick.type) {
			case "builder": {
				instance = props.collection.config.bricks?.builder?.find(
					(b) => b.key === brick.key,
				);
				break;
			}
			case "fixed": {
				instance = props.collection.config.bricks?.fixed?.find(
					(b) => b.key === brick.key,
				);
				break;
			}
		}

		if (!instance) {
			logger.error({
				scope: constants.logScopes.validation,
				message: T("error_saving_page_brick_couldnt_find_brick_config", {
					key: brick.key || "",
				}),
			});
			return errors;
		}

		const fieldErrors = recursiveFieldValidate({
			fields: brick.fields || [],
			instance: instance,
			validationData: props.validationData,
			meta: {
				useTranslations: props.collection.getData.config.useTranslations,
				defaultLocale: props.defaultLocale,
			},
		});
		if (fieldErrors.length === 0) continue;

		errors.push({
			ref: brick.ref,
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
const recursiveFieldValidate = (props: {
	fields: Array<FieldInputSchema>;
	instance: CollectionBuilder | BrickBuilder;
	validationData: ValidationData;
	parentRepeaterKey?: string;
	meta: {
		useTranslations: boolean;
		defaultLocale: string;
	};
}) => {
	const errors: FieldError[] = [];

	//*  validate all provided fields
	for (const field of props.fields) {
		const fieldInstance = props.instance.fields.get(field.key);
		if (!fieldInstance) {
			errors.push({
				key: field.key,
				localeCode: null,
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
					localeCode: null,
					message:
						validationResult.message || T("repeater_field_contains_errors"),
				});
			}

			for (let i = 0; i < field.groups.length; i++) {
				const group = field.groups[i];
				if (!group) continue;

				const groupFieldErrors = recursiveFieldValidate({
					fields: group.fields,
					instance: props.instance,
					validationData: props.validationData,
					parentRepeaterKey: field.key,
					meta: props.meta,
				});

				if (groupFieldErrors.length > 0) {
					groupErrors.push({
						ref: group.ref,
						order: group.order || i,
						fields: groupFieldErrors,
					});
				}
			}

			if (groupErrors.length > 0) {
				errors.push({
					key: field.key,
					localeCode: null,
					message: T("repeater_field_contains_errors"),
					groupErrors: groupErrors,
				});
			}

			continue;
		}

		//* handle regular fields
		const fieldErrors = validateField({
			field: field,
			instance: fieldInstance,
			validationData: props.validationData,
			meta: props.meta,
		});
		if (fieldErrors.length > 0) {
			errors.push(...fieldErrors);
		}
	}

	//* check for required fields that are missing
	const submittedFieldKeys = new Set(props.fields.map((field) => field.key));
	props.instance.fields.forEach((fieldInstance, key) => {
		if (submittedFieldKeys.has(key)) return;

		//* skip fields that belong to a different repeater context
		const fieldRepeaterParent = fieldInstance.repeater;
		if (
			(fieldRepeaterParent &&
				fieldRepeaterParent !== props.parentRepeaterKey) ||
			(!fieldRepeaterParent && props.parentRepeaterKey)
		) {
			return;
		}

		// @ts-expect-error: not all custom fields have validation config
		if (fieldInstance.config?.validation?.required) {
			errors.push({
				key: key,
				localeCode: null,
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
export const validateField = (props: {
	field: FieldInputSchema;
	instance: CustomField<FieldTypes>;
	validationData: ValidationData;
	meta: {
		useTranslations: boolean;
		defaultLocale: string;
	};
}): FieldError[] => {
	const errors: FieldError[] = [];
	const relationData = getRelationData(props.field.type, props.validationData);

	//* handle fields with translations
	if (props.field.translations) {
		for (const localeCode in props.field.translations) {
			const value = props.field.translations[localeCode];
			const validationResult = props.instance.validate({
				type: props.field.type,
				value,
				relationData,
			});

			if (!validationResult.valid) {
				errors.push({
					key: props.field.key,
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
		const validationResult = props.instance.validate({
			type: props.field.type,
			value: props.field.value,
			relationData,
		});

		if (!validationResult.valid) {
			errors.push({
				key: props.field.key,
				localeCode:
					props.meta.useTranslations && props.instance.translationsEnabled
						? props.meta.defaultLocale
						: null,
				message:
					validationResult.message ||
					T("an_unknown_error_occurred_validating_the_field"),
			});
		}
	}

	return errors;
};

export default checkValidateBricksFields;
