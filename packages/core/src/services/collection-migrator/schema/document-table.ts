import type { CollectionSchemaTable } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import {
	primaryKeyColumnType,
	defaultTimestampSimple,
} from "../../../libs/db/kysely/column-helpers.js";
import buildTableName from "../helpers/build-table-name.js";

/**
 * Returns the document table
 */
const createDocumentTable = (props: {
	collection: CollectionBuilder;
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
				columns: [
					{
						key: "id",
						source: "core",
						dataType: primaryKeyColumnType(props.options.dbAdapter),
						nullable: false,
						primary: true,
					},
					{
						key: "collection_key",
						source: "core",
						dataType: "text",
						nullable: false,
					},
					{
						key: "is_deleted",
						source: "core",
						dataType: "integer",
						defaultValue: 0,
						nullable: false,
					},
					{
						key: "is_deleted_at",
						source: "core",
						dataType: "timestamp",
						nullable: true,
					},
					{
						key: "deleted_by",
						source: "core",
						dataType: "integer",
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "SET NULL",
						},
					},
					{
						key: "created_by",
						source: "core",
						dataType: "integer",
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "SET NULL",
						},
					},
					{
						key: "updated_by",
						source: "core",
						dataType: "integer",
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "SET NULL",
						},
					},
					{
						key: "created_at",
						source: "core",
						dataType: "timestamp",
						nullable: true,
						defaultValue: defaultTimestampSimple(props.options.dbAdapter),
					},
					{
						key: "updated_at",
						source: "core",
						dataType: "timestamp",
						nullable: true,
						defaultValue: defaultTimestampSimple(props.options.dbAdapter),
					},
				],
			},
			diffs: undefined,
		},
		error: undefined,
	};
};

export default createDocumentTable;
