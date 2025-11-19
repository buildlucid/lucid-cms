import aggregateBrickTables from "./helpers/aggregate-brick-tables.js";
import prepareBricksAndFields from "./helpers/prepare-bricks-and-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import { documentBrickServices } from "../index.js";

const createMultiple: ServiceFn<
	[
		{
			versionId: number;
			documentId: number;
			bricks?: Array<BrickInputSchema>;
			fields?: Array<FieldInputSchema>;
			collection: CollectionBuilder;
			skipValidation?: boolean;
		},
	],
	undefined
> = async (context, data) => {
	// -------------------------------------------------------------------------------
	// prepare data
	const { preparedBricks, preparedFields } = prepareBricksAndFields({
		collection: data.collection,
		bricks: data.bricks,
		fields: data.fields,
		localization: context.config.localization,
	});

	// -------------------------------------------------------------------------------
	// validate bricks
	if (data.skipValidation !== true) {
		const checkBrickOrderRes = documentBrickServices.checks.checkDuplicateOrder(
			data.bricks || [],
		);
		if (checkBrickOrderRes.error) return checkBrickOrderRes;

		const checkValidateRes =
			await documentBrickServices.checks.checkValidateBricksFields(context, {
				collection: data.collection,
				bricks: data.bricks || [],
				fields: data.fields || [],
			});
		if (checkValidateRes.error) return checkValidateRes;
	}

	// -------------------------------------------------------------------------------
	// construct all required tables and rows grouped by prio
	const brickTables = aggregateBrickTables({
		collection: data.collection,
		documentId: data.documentId,
		versionId: data.versionId,
		localization: context.config.localization,
		bricks: preparedBricks,
		fields: preparedFields,
	});
	const sortedTables = brickTables.sort((a, b) => a.priority - b.priority);

	// -------------------------------------------------------------------------------
	// insert rows
	const insertRes = await documentBrickServices.insertBrickTables(context, {
		tables: sortedTables,
		collection: data.collection,
	});
	if (insertRes.error) return insertRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default createMultiple;
