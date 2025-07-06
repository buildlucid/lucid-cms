import type { InferredColumn } from "../../../types.js";
import type { CollectionSchemaColumn } from "../../../libs/collection/schema/types.js";

/**
 * Determines if two foreign keys are equal between the collection/brick columns FK and the DB Adapters inferred column FK
 */
const foreignKeysEqual = (
	newKey?: CollectionSchemaColumn["foreignKey"],
	existingKey?:
		| CollectionSchemaColumn["foreignKey"]
		| InferredColumn["foreignKey"],
): boolean => {
	if (!newKey && !existingKey) return true;
	if (!newKey || !existingKey) return false;

	return (
		newKey.table === existingKey.table &&
		newKey.column === existingKey.column &&
		newKey.onDelete === existingKey.onDelete &&
		newKey.onUpdate === existingKey.onUpdate
	);
};

export default foreignKeysEqual;
