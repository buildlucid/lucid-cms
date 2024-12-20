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
	dbAdapter: AdapterType;
}): Awaited<
	ServiceResponse<{
		schema: CollectionSchemaTable;
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
				type: "versions",
				key: {
					collection: props.collection.key,
				},
				columns: [
					{
						name: "id",
						source: "core",
						type: primaryKeyColumnType(props.dbAdapter),
						nullable: false,
						primary: true,
					},
					{
						name: "collection_key",
						source: "core",
						type: "text",
						nullable: false,
					},
					{
						name: "document_id",
						source: "core",
						type: "integer",
						nullable: false,
						foreignKey: {
							table: documentTableRes.data,
							column: "id",
							onDelete: "CASCADE",
						},
					},
					{
						name: "type",
						source: "core",
						type: "text",
						default: "draft",
						nullable: false,
					},
				],
			},
		},
		error: undefined,
	};
};

export default createVersionsTable;
