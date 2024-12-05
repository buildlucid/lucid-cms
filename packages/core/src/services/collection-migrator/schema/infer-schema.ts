import type { CollectionSchema } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import {
	primaryKeyColumnType,
	defaultTimestampSimple,
} from "../../../libs/db/kysely/column-helpers.js";

/**
 * Infers the collection schema from a given CollectionBuilder instance
 */
const inferSchema = (
	collection: CollectionBuilder,
	dbAdapter: AdapterType,
): Awaited<ServiceResponse<CollectionSchema>> => {
	const tablePreix = `lucid_collection_${collection.key}`;
	const tables: CollectionSchema["tables"] = [];

	// base table
	tables.push({
		name: tablePreix,
		type: "document",
		key: {
			collection: collection.key,
		},
		columns: [
			{
				key: "id",
				source: "core",
				dataType: primaryKeyColumnType(dbAdapter),
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
				defaultValue: defaultTimestampSimple(dbAdapter),
			},
			{
				key: "updated_at",
				source: "core",
				dataType: "timestamp",
				nullable: true,
				defaultValue: defaultTimestampSimple(dbAdapter),
			},
		],
	});

	return {
		data: {
			key: collection.key,
			tables: tables,
		},
		error: undefined,
	};
};

export default inferSchema;
