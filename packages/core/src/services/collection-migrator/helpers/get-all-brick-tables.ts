import inferSchema from "../schema/infer-schema.js";
import type { CollectionBuilder } from "../../../builders.js";
import type DatabaseAdapter from "../../../libs/db/adapter.js";
import type { LucidBricksTable, LucidBrickTableName } from "../../../types.js";
import type { ServiceResponse } from "../../../types.js";

/**
 * Takes a collection, returns all possible brick tables and their columns
 */
const getAllBrickTables = (
	collection: CollectionBuilder,
	db: DatabaseAdapter,
): Awaited<
	ServiceResponse<
		Array<{
			table: LucidBrickTableName;
			columns: Array<keyof LucidBricksTable>;
		}>
	>
> => {
	const schemaRes = inferSchema(collection, db);
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables
			.filter((table) => table.type !== "document" && table.type !== "versions")
			.map((table) => ({
				table: table.name as LucidBrickTableName,
				columns: table.columns.map((col) => col.name as keyof LucidBricksTable),
			})),
	};
};

export default getAllBrickTables;
