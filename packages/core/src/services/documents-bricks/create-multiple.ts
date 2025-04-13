import aggregateBrickTables from "./helpers/aggregate-brick-tables.js";
import prepareBricksAndFields from "./helpers/prepare-bricks-and-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";

const createMultiple: ServiceFn<
	[
		{
			versionId: number;
			documentId: number;
			bricks?: Array<BrickSchema>;
			fields?: Array<FieldSchemaType>;
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
	});

	// -------------------------------------------------------------------------------
	// validate bricks
	if (data.skipValidation !== true) {
		const checkBrickOrderRes =
			context.services.collection.documentBricks.checks.checkDuplicateOrder(
				data.bricks || [],
			);
		if (checkBrickOrderRes.error) return checkBrickOrderRes;

		const checkValidateRes =
			await context.services.collection.documentBricks.checks.checkValidateBricksFields(
				context,
				{
					collection: data.collection,
					bricks: data.bricks || [],
					fields: data.fields || [],
				},
			);
		if (checkValidateRes.error) return checkValidateRes;
	}

	// -------------------------------------------------------------------------------
	// construct all required tables and rows grouped by prio
	const brickTables = aggregateBrickTables({
		collection: data.collection,
		documentId: data.documentId,
		versionId: data.versionId,
		localisation: context.config.localisation,
		bricks: preparedBricks,
		fields: preparedFields,
	});
	const sortedTables = brickTables.sort((a, b) => a.priority - b.priority);

	// -------------------------------------------------------------------------------
	// insert rows
	const insertRes =
		await context.services.collection.documentBricks.insertBrickTables(
			context,
			{
				tables: sortedTables,
			},
		);
	if (insertRes.error) return insertRes;

	return {
		error: undefined,
		data: undefined,
	};
};

export default createMultiple;
