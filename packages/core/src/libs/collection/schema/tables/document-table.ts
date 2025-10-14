import type CollectionBuilder from "../../../../libs/builders/collection-builder/index.js";
import type DatabaseAdapter from "../../../../libs/db-adapter/adapter-base.js";
import type { ServiceResponse } from "../../../../types.js";
import buildTableName from "../../helpers/build-table-name.js";
import type { CollectionSchemaTable } from "../types.js";

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
						type: props.db.getDataType("primary"),
						nullable: false,
						primary: true,
					},
					{
						name: "collection_key",
						source: "core",
						type: props.db.getDataType("text"),
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
						type: props.db.getDataType("boolean"),
						default: props.db.getDefault("boolean", "false"),
						nullable: false,
					},
					{
						name: "is_deleted_at",
						source: "core",
						type: props.db.getDataType("timestamp"),
						nullable: true,
					},
					{
						name: "deleted_by",
						source: "core",
						type: props.db.getDataType("integer"),
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
						type: props.db.getDataType("integer"),
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
						type: props.db.getDataType("timestamp"),
						nullable: true,
						default: props.db.getDefault("timestamp", "now"),
					},
					{
						name: "updated_by",
						source: "core",
						type: props.db.getDataType("integer"),
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "set null",
						},
					},
					{
						name: "updated_at",
						source: "core",
						type: props.db.getDataType("timestamp"),
						nullable: true,
						default: props.db.getDefault("timestamp", "now"),
					},
				],
			},
		},
		error: undefined,
	};
};

export default createDocumentTable;
