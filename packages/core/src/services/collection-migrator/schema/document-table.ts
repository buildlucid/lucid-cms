import type { CollectionSchemaTable } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import {
	typeLookup,
	defaultTimestampSimple,
} from "../../../libs/db/kysely/column-helpers.js";
import buildTableName from "../helpers/build-table-name.js";

/**
 * Returns the document table
 */
const createDocumentTable = (props: {
	collection: CollectionBuilder;
	dbAdapter: AdapterType;
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
						type: typeLookup("serial", props.dbAdapter),
						nullable: false,
						primary: true,
					},
					{
						name: "collection_key",
						source: "core",
						type: typeLookup("text", props.dbAdapter),
						nullable: false,
					},
					{
						name: "is_deleted",
						source: "core",
						type: typeLookup("integer", props.dbAdapter),
						default: 0,
						nullable: false,
					},
					{
						name: "is_deleted_at",
						source: "core",
						type: typeLookup("timestamp", props.dbAdapter),
						nullable: true,
					},
					{
						name: "deleted_by",
						source: "core",
						type: typeLookup("integer", props.dbAdapter),
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "SET NULL",
						},
					},
					{
						name: "created_by",
						source: "core",
						type: typeLookup("integer", props.dbAdapter),
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "SET NULL",
						},
					},
					{
						name: "updated_by",
						source: "core",
						type: typeLookup("integer", props.dbAdapter),
						nullable: true,
						foreignKey: {
							table: "lucid_users",
							column: "id",
							onDelete: "SET NULL",
						},
					},
					{
						name: "created_at",
						source: "core",
						type: typeLookup("timestamp", props.dbAdapter),
						nullable: true,
						default: defaultTimestampSimple(props.dbAdapter),
					},
					{
						name: "updated_at",
						source: "core",
						type: typeLookup("timestamp", props.dbAdapter),
						nullable: true,
						default: defaultTimestampSimple(props.dbAdapter),
					},
				],
			},
		},
		error: undefined,
	};
};

export default createDocumentTable;
