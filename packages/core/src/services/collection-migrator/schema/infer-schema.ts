import type {
	CollectionSchema,
	CollectionSchemaTable,
	TableType,
} from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { BrickBuilder, CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import {
	primaryKeyColumnType,
	defaultTimestampSimple,
} from "../../../libs/db/kysely/column-helpers.js";
import type { CFConfig, FieldTypes, TabFieldConfig } from "../../../types.js";
import buildTableName from "../helpers/build-table-name.js";
import createDocumentTable from "./document-table.js";
import createVersionsTable from "./versions-table.js";

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
	options: {
		dbAdapter: AdapterType;
	},
): Awaited<ServiceResponse<CollectionSchema>> => {
	const tablePreix = `lucid_collection_${collection.key}`;
	const tables: Array<CollectionSchemaTable> = [];
	// const diffs: [];

	//* document table
	const documentTableRes = createDocumentTable({
		collection: collection,
		// previousSchema: unknown,
		options: {
			dbAdapter: options.dbAdapter,
		},
	});
	if (documentTableRes.error) return documentTableRes;
	tables.push(documentTableRes.data.schema);

	//* version table
	const versionTableRes = createDocumentTable({
		collection: collection,
		// previousSchema: unknown,
		options: {
			dbAdapter: options.dbAdapter,
		},
	});
	if (versionTableRes.error) return versionTableRes;
	tables.push(versionTableRes.data.schema);

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
				dataType: primaryKeyColumnType(options.dbAdapter),
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
		type: "brick",
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
