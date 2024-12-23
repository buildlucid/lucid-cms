import type { CollectionSchemaTable, TableType } from "../schema/types.js";

const TABLE_PRIORITY: Record<TableType, number> = {
	document: 1000,
	versions: 900,
	"document-fields": 800,
	brick: 700,
	repeater: 600,
};
// const EXTERNAL_REFERENCE_PRIORITY = 100;

/**
 * Works out the table priority based on its type and foreign keys
 * @todo implement solution for determining foreign key prio
 */
const getTablePriority = (table: CollectionSchemaTable) => {
	const basePriority = TABLE_PRIORITY[table.type];

	// const hasExternalReferences = table.columns.some((column) => {
	// 	if (!column.foreignKey) return false;
	// });

	// Reduce priority if table has external references
	// if (hasExternalReferences) {
	// 	basePriority -= EXTERNAL_REFERENCE_PRIORITY;
	// }

	return basePriority;
};

export default getTablePriority;
