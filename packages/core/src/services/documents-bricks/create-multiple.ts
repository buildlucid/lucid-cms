import Repository from "../../libs/repositories/index.js";
import util from "node:util";
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
	const Bricks = Repository.get(
		"document-bricks",
		context.db,
		context.config.db,
	);

	// -------------------------------------------------------------------------------
	// prepare data
	const { preparedBricks, preparedFields } = prepareBricksAndFields({
		collection: data.collection,
		bricks: data.bricks,
		fields: data.fields,
	});

	// -------------------------------------------------------------------------------
	// validate bricks

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

	console.log(
		util.inspect(brickTables, { showHidden: false, depth: null, colors: true }),
	);

	// -------------------------------------------------------------------------------
	// insert rows into corresponding table, updating children repeater _parent_id values on success

	return {
		error: undefined,
		data: undefined,
	};
};

export default createMultiple;
