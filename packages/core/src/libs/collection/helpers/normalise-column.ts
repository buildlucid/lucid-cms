import type { CollectionSchemaColumn } from "../../../libs/collection/schema/types.js";
import type { InferredColumn } from "../../../types.js";

/**
 * Normalises the column schema for both the columns inferred from collection/brick's along with inferred columns from the DB Adapter implementation
 */
const normaliseColumn = (
	column: CollectionSchemaColumn | InferredColumn,
	source: CollectionSchemaColumn["source"],
): CollectionSchemaColumn => {
	return {
		source: source,
		name: column.name,
		type: column.type,
		nullable: column.nullable ?? false,
		default: column.default ?? null,
		foreignKey: column.foreignKey
			? {
					table: column.foreignKey.table,
					column: column.foreignKey.column,
					onDelete: column.foreignKey.onDelete ?? "no action",
					onUpdate: column.foreignKey.onUpdate ?? "no action",
				}
			: undefined,
		unique: column.unique ?? false,
		primary: column.primary ?? false,
	};
};

export default normaliseColumn;
