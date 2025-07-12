import type {
	TableType,
	CollectionSchemaTable,
} from "../../../libs/collection/schema/types.js";
import type { InferredTable, ServiceResponse } from "../../../types.js";
import inferTableType from "./infer-table-type.js";

const TABLE_PRIORITY: Record<TableType, number> = {
	document: 1000,
	versions: 900,
	"document-fields": 800,
	brick: 700,
	repeater: 600,
};
const EXTERNAL_REFERENCE_PRIORITY = 100;
const REPEATER_DEPTH_PRIORITY = 10;

/**
 * Works out the table priority based on its type and foreign keys
 */
const getTablePriority = (
	type: "db-inferred" | "collection-inferred",
	table: InferredTable | CollectionSchemaTable,
): Awaited<ServiceResponse<number>> => {
	let tableType: TableType;

	if (type === "db-inferred") {
		const tableTypeRes = inferTableType(table.name);
		if (tableTypeRes.error) return tableTypeRes;
		tableType = tableTypeRes.data;
	} else tableType = (table as CollectionSchemaTable).type;

	let basePriority = TABLE_PRIORITY[tableType];

	const hasExternalReferences = table.columns.some((column) => {
		if (!column.foreignKey) return false;
	});
	if (hasExternalReferences) {
		basePriority -= EXTERNAL_REFERENCE_PRIORITY;
	}

	if (type === "collection-inferred") {
		const repeaterDepth = (table as CollectionSchemaTable).key.repeater?.length;
		if (repeaterDepth) {
			basePriority -= repeaterDepth * REPEATER_DEPTH_PRIORITY;
		}
	}

	return {
		data: basePriority,
		error: undefined,
	};
};

export default getTablePriority;
