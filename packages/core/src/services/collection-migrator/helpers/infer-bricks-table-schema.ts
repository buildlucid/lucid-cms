import inferSchema from "../schema/infer-schema.js";
import type { CollectionBuilder } from "../../../builders.js";
import type DatabaseAdapter from "../../../libs/db/adapter.js";
import type { LucidBrickTableName } from "../../../types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionSchemaTable } from "../schema/types.js";

/**
 * Takes a collection, calls inferSchema and filters response to just include bricks
 */
const inferBricksTableSchema = (
	collection: CollectionBuilder,
	db: DatabaseAdapter,
): Awaited<
	ServiceResponse<Array<CollectionSchemaTable<LucidBrickTableName>>>
> => {
	const schemaRes = inferSchema(collection, db);
	if (schemaRes.error) return schemaRes;

	return {
		error: undefined,
		data: schemaRes.data.tables
			.filter((table) => table.type !== "document" && table.type !== "versions")
			.map((table) => ({
				name: table.name as LucidBrickTableName,
				type: table.type,
				columns: table.columns,
				key: table.key,
			})),
	};
};

export default inferBricksTableSchema;
