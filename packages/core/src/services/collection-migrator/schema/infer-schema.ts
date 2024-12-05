import type { CollectionSchema } from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { BrickBuilder, CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import {
	primaryKeyColumnType,
	defaultTimestampSimple,
} from "../../../libs/db/kysely/column-helpers.js";
import type { CFConfig, FieldTypes, TabFieldConfig } from "../../../types.js";

/**
 * Infers the collection schema from a given CollectionBuilder instance
 * @todo sort tables based on foreign keys
 * @todo plan out core table columns and create a helper for adding them
 * @todo extend the CustomField classes to support defining their column data type
 * @todo split up table creation depedning on types
 * @todo update to accept existing schema for the collection and use to generate the migration strategy
 * @todo returns the migration strategy instead for this collection
 * @todo table names likley need special key to denote the start of the brick key, field key etc to avoid naming conflicts. BrickBuilder will need to validate these names to not include they special keys
 */
const inferSchema = (
	collection: CollectionBuilder,
	dbAdapter: AdapterType,
): Awaited<ServiceResponse<CollectionSchema>> => {
	const tablePreix = `lucid_collection_${collection.key}`;
	const tables: CollectionSchema["tables"] = [];

	// base tables
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
	tables.push({
		name: `${tablePreix}_versions`,
		type: "versions",
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
				key: "document_id",
				source: "core",
				dataType: "integer",
				nullable: false,
				foreignKey: {
					table: tablePreix,
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
	});

	// Fields
	const buildFieldTables = (
		fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[],
		config: {
			type: "document-fields" | "brick" | "repeater";
			key: string;
			tableName: string;
		},
	) => {
		// TODO: depending on the type, different columns may be needed. Repeater for example will need to have a fforeignKey on its brick table id
		const columns: CollectionSchema["tables"][0]["columns"] = [
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
				key: "document_id",
				source: "core",
				dataType: "integer",
				nullable: false,
				foreignKey: {
					table: tablePreix,
					column: "id",
					onDelete: "CASCADE",
				},
			},
			{
				key: "document_version_id",
				source: "core",
				dataType: "integer",
				nullable: false,
				foreignKey: {
					table: `${tablePreix}_versions`,
					column: "id",
					onDelete: "CASCADE",
				},
			},
			{
				key: "locale",
				source: "core",
				dataType: "integer",
				nullable: false,
				foreignKey: {
					table: "lucid_locales",
					column: "code",
					onDelete: "CASCADE",
				},
			},
		];
		const currentTableName = `${config.tableName}_${config.key}`;

		for (const f of fields) {
			columns.push({
				key: f.key,
				source: "field",
				dataType: f.type === "text" ? "text" : "text", //* needs to call new dataType getter
				nullable: true,
				// foreignKey: {
				//     table: '',
				//     column: '',
				//     onDelete: 'SET NULL'
				// }
			});
			if (f.type === "repeater") {
				buildFieldTables(f.fields, {
					type: "repeater",
					key: f.key,
					tableName: currentTableName,
				});
			}
		}

		tables.push({
			name: currentTableName,
			type: config.type,
			key: {
				collection: collection.key,
			},
			columns: columns,
		});
	};

	for (const brick of collection.brickInstances) {
		buildFieldTables(brick.fieldTreeNoTab, {
			type: "brick",
			key: brick.key,
			tableName: tablePreix,
		});
	}
	buildFieldTables(collection.fieldTreeNoTab, {
		type: "document-fields",
		key: "fields",
		tableName: tablePreix,
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
