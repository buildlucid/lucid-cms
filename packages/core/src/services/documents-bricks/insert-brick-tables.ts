import { DocumentBricksRepository } from "../../libs/repositories/index.js";
import { getBricksTableSchema } from "../../libs/collection/schema/live/schema-filters.js";
import type { ServiceFn } from "../../utils/services/types.js";
import type { LucidBricksTable } from "../../types.js";
import type { InsertBrickTables } from "./helpers/construct-brick-table.js";
import type CollectionBuilder from "../../libs/builders/collection-builder/index.js";
import type { ColumnDataType } from "kysely";

const insertBrickTables: ServiceFn<
	[
		{
			tables: InsertBrickTables[];
			collection: CollectionBuilder;
		},
	],
	undefined
> = async (context, data) => {
	const Bricks = new DocumentBricksRepository(context.db, context.config.db);

	const idMapping: Record<number, number> = {};

	const bricksTableSchemaRes = await getBricksTableSchema(
		context,
		data.collection.key,
	);
	if (bricksTableSchemaRes.error) return bricksTableSchemaRes;

	for (const table of data.tables) {
		// update parent and brick IDs using the mappings before inserting
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

			// check for brick_id that needs updating
			if (
				"brick_id" in row &&
				typeof row.brick_id === "number" &&
				row.brick_id < 0
			) {
				// Look up the actual brick ID from the mapping
				const mappedBrickId = idMapping[row.brick_id];
				if (mappedBrickId) row.brick_id = mappedBrickId;
			}
		}

		// determine which columns to return
		const hasParentIdRef = table.data.some((row) => "parent_id_ref" in row);
		const hasBrickIdRef = table.data.some((row) => "brick_id_ref" in row);
		const returningColumns: Array<keyof LucidBricksTable> = [];
		// always return ID
		returningColumns.push("id");
		// return additional columns as needed for mapping
		if (hasParentIdRef) returningColumns.push("parent_id_ref");
		if (hasBrickIdRef) returningColumns.push("brick_id_ref");

		const schema = bricksTableSchemaRes.data.find(
			(s) => s.name === table.table,
		);

		// insert rows for this table
		const response = await Bricks.createMultiple(
			{
				data: table.data,
				returning: returningColumns,
			},
			{
				tableName: table.table,
				columns:
					schema?.columns.reduce<Record<string, ColumnDataType>>(
						(record, column) => {
							record[column.name] = column.type;
							return record;
						},
						{},
					) || {},
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

				if (
					"brick_id_ref" in originalRow &&
					typeof originalRow.brick_id_ref === "number" &&
					originalRow.brick_id_ref < 0
				) {
					idMapping[originalRow.brick_id_ref] = insertedRow.id as number;
				}
			}
		}
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default insertBrickTables;
