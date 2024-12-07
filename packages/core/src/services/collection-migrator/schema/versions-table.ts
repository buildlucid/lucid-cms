import type { CollectionSchemaTable } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import { primaryKeyColumnType } from "../../../libs/db/kysely/column-helpers.js";
import buildTableName from "../helpers/build-table-name.js";

/**
 * Returns the versions table
 */
const createVersionsTable = (props: {
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
	const tableNameRes = buildTableName("versions", {
		collection: props.collection.key,
	});
	const documentTableRes = buildTableName("document", {
		collection: props.collection.key,
	});

	if (tableNameRes.error) return tableNameRes;
	if (documentTableRes.error) return documentTableRes;

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
						key: "document_id",
						source: "core",
						dataType: "integer",
						nullable: false,
						foreignKey: {
							table: documentTableRes.data,
							column: "id",
							onDelete: "CASCADE",
						},
					},
					{
						key: "type",
						source: "core",
						dataType: "text",
						defaultValue: "draft",
						nullable: false,
					},
				],
			},
			diffs: undefined,
		},
		error: undefined,
	};
};

export default createVersionsTable;
