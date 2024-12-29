import type { CollectionSchemaTable } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type DatabaseAdapter from "../../../libs/db/adapter.js";
import buildTableName from "../helpers/build-table-name.js";

/**
 * Returns the document table
 */
const createDocumentTable = (props: {
	collection: CollectionBuilder;
	db: DatabaseAdapter;
}): Awaited<
	ServiceResponse<{
		schema: CollectionSchemaTable;
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
						name: "is_deleted",
						source: "core",
						type: props.db.getColumnType("integer"),
						default: 0,
						nullable: false,
					},
					{
						name: "is_deleted_at",
						source: "core",
						type: props.db.getColumnType("timestamp"),
						nullable: true,
					},
					{
						name: "deleted_by",
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
						name: "created_at",
						source: "core",
						type: props.db.getColumnType("timestamp"),
						nullable: true,
						default: props.db.config.defaults.timestamp,
					},
				],
			},
		},
		error: undefined,
	};
};

export default createDocumentTable;
