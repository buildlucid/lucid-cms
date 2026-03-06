import type {
	CollectionSchemaTable,
	CoreTableType,
	TableType,
} from "../../../libs/collection/schema/types.js";
import T from "../../../translations/index.js";
import type { InferredTable, ServiceResponse } from "../../../types.js";
import {
	getFieldDatabaseConfig,
	getStorageModeBasePriority,
	isCustomFieldTableType,
	isStorageMode,
} from "../custom-fields/storage/index.js";
import { treeTableMode } from "../custom-fields/storage/tree-table.js";
import inferTableType from "./infer-table-type.js";

const TABLE_PRIORITY: Record<CoreTableType, number> = {
	document: 1000,
	versions: 900,
	"document-fields": 800,
	brick: 700,
};
const EXTERNAL_REFERENCE_PRIORITY = 100;

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

	let basePriority: number;
	if (isCustomFieldTableType(tableType)) {
		const databaseConfig = getFieldDatabaseConfig(tableType);
		if (!databaseConfig) {
			return {
				data: undefined,
				error: {
					message: T("invalid_table_name_format_insufficient_parts"),
				},
			};
		}
		basePriority = getStorageModeBasePriority(databaseConfig.mode);
	} else {
		basePriority = TABLE_PRIORITY[tableType];
	}

	const hasExternalReferences = table.columns.some((column) => {
		if (!column.foreignKey) return false;
		return true;
	});
	if (hasExternalReferences) {
		basePriority -= EXTERNAL_REFERENCE_PRIORITY;
	}

	if (type === "collection-inferred") {
		if (isCustomFieldTableType(tableType)) {
			const databaseConfig = getFieldDatabaseConfig(tableType);
			const treeDepth = (table as CollectionSchemaTable).key.fieldPath?.length;

			if (
				databaseConfig &&
				isStorageMode(databaseConfig, "tree-table") &&
				treeDepth
			) {
				basePriority -= treeTableMode.getPriorityOffsetForDepth(treeDepth);
			}
		}
	}

	return {
		data: basePriority,
		error: undefined,
	};
};

export default getTablePriority;
