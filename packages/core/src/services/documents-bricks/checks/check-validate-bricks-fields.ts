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

export interface FieldErrors {
	key: string;
	localeCode: string;
	message: string;
	groupErrors?: Array<Array<FieldErrors>>;
}

interface BrickError {
	fields: FieldErrors[];
}

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
	const validateFields = recursiveFieldValidate(data.fields, data.collection);

	return {
		data: undefined,
		error: undefined,
	};
};

const validateBricks = (
	brick: Array<BrickSchema>,
	collection: CollectionBuilder,
): Array<BrickError> => {
	const errors: BrickError[] = [];

	return errors;
};

const recursiveFieldValidate = (
	fields: Array<FieldSchemaType>,
	collection: CollectionBuilder,
) => {
	const errors: FieldErrors[] = [];

	return errors;
};

export default checkValidateBricksFields;
