import { typeLookup } from "../../../libs/db/kysely/column-helpers.js";
import buildTableName from "../helpers/build-table-name.js";
import type { CollectionSchemaTable } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";

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
						name: "document_id",
						source: "core",
						type: typeLookup("integer", props.dbAdapter),
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
						type: typeLookup("text", props.dbAdapter),
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
