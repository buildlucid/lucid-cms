import T from "../../../translations/index.js";
import logger from "../../../utils/logging/index.js";
import Repository from "../../../libs/repositories/index.js";
import type { FieldErrors } from "../../../types/errors.js";
import type { FieldTypes } from "../../../libs/custom-fields/types.js";
import type BrickBuilder from "../../../libs/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import type {
	ServiceContext,
	ServiceFn,
} from "../../../utils/services/types.js";
import type { BrickSchema } from "../../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../../types.js";

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
	return {
		data: undefined,
		error: undefined,
	};
};

export default checkValidateBricksFields;
