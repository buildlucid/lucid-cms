import buildTableName from "../helpers/build-table-name.js";
import type { CollectionSchemaTable } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type DatabaseAdapter from "../../../libs/db/adapter.js";

/**
 * Returns the versions table
 */
const createVersionsTable = (props: {
	collection: CollectionBuilder;
	db: DatabaseAdapter;
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
						type: props.db.getColumnType("serial"),
						nullable: false,
						primary: true,
					},
					{
						name: "collection_key",
						source: "core",
						type: props.db.getColumnType("text"),
						nullable: false,
						foreignKey: {
							table: "lucid_collections",
							column: "key",
							onDelete: "cascade",
						},
					},
					{
						name: "document_id",
						source: "core",
						type: props.db.getColumnType("integer"),
						nullable: false,
						foreignKey: {
							table: documentTableRes.data,
							column: "id",
							onDelete: "cascade",
						},
					},
					{
						name: "type",
						source: "core",
						type: props.db.getColumnType("text"),
						default: "draft",
						nullable: false,
					},
					{
						name: "created_by",
						source: "core",
						type: props.db.getColumnType("integer"),
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "set null",
						},
					},
					{
						name: "updated_by",
						source: "core",
						type: props.db.getColumnType("integer"),
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "set null",
						},
					},
					{
						name: "created_at",
						source: "core",
						type: props.db.getColumnType("timestamp"),
						nullable: true,
						default: props.db.config.defaults.timestamp.now,
					},
					{
						name: "updated_at",
						source: "core",
						type: props.db.getColumnType("timestamp"),
						nullable: true,
						default: props.db.config.defaults.timestamp.now,
					},
				],
			},
		},
		error: undefined,
	};
};

export default createVersionsTable;
