import Repository from "../../libs/repositories/index.js";
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
	const idMapping: Record<number, number> = {};

	for (const table of sortedTables) {
		// update parent IDs using the mappings before inserting
		for (const row of table.data) {
			// check for parent_id_ref that needs updating
			if (
				"_parent_id_ref" in row &&
				typeof row._parent_id_ref === "number" &&
				row._parent_id_ref < 0
			) {
				// try primary mapping first
				const mappedId = idMapping[row._parent_id_ref];
				if (mappedId) row._parent_id = mappedId;
				// fall back to parent_id mapping if available
				else if (
					"_parent_id" in row &&
					typeof row._parent_id === "number" &&
					row._parent_id < 0 &&
					idMapping[row._parent_id]
				) {
					row._parent_id = idMapping[row._parent_id];
				}
			}
		}

		// determine which columns to return
		const hasParentIdRef = table.data.some((row) => "_parent_id_ref" in row);
		const returningColumns = hasParentIdRef
			? ["_id", "_parent_id_ref"]
			: ["_id"];

		// insert rows for this table
		const response = await Bricks.createMultiple(
			{
				data: table.data,
				returning: returningColumns,
			},
			{
				tableName: table.table,
			},
		);
		if (response.error) return response;

		// create mappings for the next tables
		if (response.data?.length) {
			for (let i = 0; i < response.data.length; i++) {
				const insertedRow = response.data[i];
				const originalRow = table.data[i];
				if (!insertedRow || !originalRow) continue;

				if (
					"_parent_id_ref" in originalRow &&
					typeof originalRow._parent_id_ref === "number" &&
					originalRow._parent_id_ref < 0
				) {
					idMapping[originalRow._parent_id_ref] = insertedRow._id as number;
				}

				if (
					"_parent_id" in originalRow &&
					typeof originalRow._parent_id === "number" &&
					originalRow._parent_id < 0
				) {
					idMapping[originalRow._parent_id] = insertedRow._id as number;
				}
			}
		}
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default createMultiple;
