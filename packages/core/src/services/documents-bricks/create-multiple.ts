import Repository from "../../libs/repositories/index.js";
import aggregateBrickTables from "./helpers/aggregate-brick-tables.js";
import prepareBricksAndFields from "./helpers/prepare-bricks-and-fields.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";
import type { BrickSchema } from "../../schemas/collection-bricks.js";
import type { FieldSchemaType } from "../../schemas/collection-fields.js";
import type { LucidBricksTable } from "../../types.js";

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
				"parent_id_ref" in row &&
				typeof row.parent_id_ref === "number" &&
				row.parent_id_ref < 0
			) {
				// try primary mapping first
				const mappedId = idMapping[row.parent_id_ref];
				if (mappedId) row.parent_id = mappedId;
				// fall back to parent_id mapping if available
				else if (
					"parent_id" in row &&
					typeof row.parent_id === "number" &&
					row.parent_id < 0 &&
					idMapping[row.parent_id]
				) {
					row.parent_id = idMapping[row.parent_id];
				}
			}
		}

		// determine which columns to return
		const hasParentIdRef = table.data.some((row) => "parent_id_ref" in row);
		const returningColumns: Array<keyof LucidBricksTable> = hasParentIdRef
			? ["id", "parent_id_ref"]
			: ["id"];

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
					"parent_id_ref" in originalRow &&
					typeof originalRow.parent_id_ref === "number" &&
					originalRow.parent_id_ref < 0
				) {
					idMapping[originalRow.parent_id_ref] = insertedRow.id as number;
				}

				if (
					"parent_id" in originalRow &&
					typeof originalRow.parent_id === "number" &&
					originalRow.parent_id < 0
				) {
					idMapping[originalRow.parent_id] = insertedRow.id as number;
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
