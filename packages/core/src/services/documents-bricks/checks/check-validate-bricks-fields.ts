import T from "../../../translations/index.js";
import logger from "../../../utils/logging/index.js";
import Repository from "../../../libs/repositories/index.js";
// import type { FieldErrors } from "../../../types/errors.js";
import type { FieldTypes } from "../../../libs/custom-fields/types.js";
import type BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";
import type { BrickSchema } from "../../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../../types.js";
import type CustomField from "../../../libs/custom-fields/custom-field.js";

export interface FieldErrors {
	key: string;
	localeCode?: string;
	message: string;
	groupErrors?: Array<GroupError>;
}

interface GroupError {
	id: string | number;
	order?: number;
	fields: FieldErrors[];
}

interface BrickError {
	id: number | string;
	key?: string;
	order?: number;
	fields: FieldErrors[];
}

//@ts-expect-error: TODO: remove once brickerror and fielderror is added to error response type
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
	/*
        1. work out and extract all media id's and user id's    
        2. fetch data required for validation 
            - users
            - media
        3. validate bricks
            - loop through them all and call a recursiveFieldValidate fn
            - return any/all of the errors
        4. validate fields
            - call recursiveFieldValidate fn
            - return any/all of the errors
        5. if either field or brick errors are > than 0 reurn an error object - this will parody the brick/field nested structure instead of being flat like before
        6. return success
    */

	const brickErrors = validateBricks(data.bricks, data.collection);
	const fieldErrors = recursiveFieldValidate(data.fields, data.collection);

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
): Array<BrickError> => {
	const errors: BrickError[] = [];

	for (const brick of bricks) {
		let instance = undefined;

		switch (brick.type) {
			case "collection-fields": {
				instance = collection;
				break;
			}
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

		const fieldErrors = recursiveFieldValidate(brick.fields || [], instance);
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
) => {
	const errors: FieldErrors[] = [];

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

			for (let i = 0; i < field.groups.length; i++) {
				const group = field.groups[i];
				if (!group) continue;

				const groupFieldErrors = recursiveFieldValidate(group.fields, instance);

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
		const fieldErrors = validateField(field, fieldInstance);
		if (fieldErrors.length > 0) {
			errors.push(...fieldErrors);
		}
	}

	return errors;
};

const validateField = (
	field: FieldSchemaType,
	instance: CustomField<FieldTypes>,
): FieldErrors[] => {
	return [];
};

export default checkValidateBricksFields;
