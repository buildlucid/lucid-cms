import type { CollectionSchemaTable } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { BrickBuilder, CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import type { CFConfig, FieldTypes, TabFieldConfig } from "../../../types.js";
import {
	primaryKeyColumnType,
	defaultTimestampSimple,
} from "../../../libs/db/kysely/column-helpers.js";
import buildTableName from "../helpers/build-table-name.js";

/**
 * Returns the brick/document fields table
 */
const createFieldTable = (props: {
	collection: CollectionBuilder;
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
	type: "brick" | "document-fields";
	brick?: BrickBuilder;

	// previousSchema: CollectionSchemaTable;

	options: {
		dbAdapter: AdapterType;
	};
}): Awaited<
	ServiceResponse<{
		schema: CollectionSchemaTable;
		diffs: undefined;
	}>
> => {
	const tableNameRes = buildTableName("document", {
		collection: props.collection.key,
	});
	if (tableNameRes.error) return tableNameRes;

	return {
		data: {
			schema: {
				name: tableNameRes.data,
				type: "document",
				key: {
					collection: props.collection.key,
				},
				columns: [],
			},
			diffs: undefined,
		},
		error: undefined,
	};
};

export default createFieldTable;
