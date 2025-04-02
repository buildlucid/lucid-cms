import inferSchema from "../schema/infer-schema.js";
import type { CollectionBuilder } from "../../../builders.js";
import type DatabaseAdapter from "../../../libs/db/adapter.js";
import type { LucidBricksTable, LucidBrickTableName } from "../../../types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionSchemaColumn } from "../schema/types.js";

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
			columns: CollectionSchemaColumn[];
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
				columns: table.columns,
			})),
	};
};

export default getAllBrickTables;
