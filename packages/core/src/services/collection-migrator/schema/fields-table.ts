import type {
	CollectionSchemaTable,
	CollectionSchemaColumn,
	TableType,
} from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import type { CFConfig, FieldTypes, TabFieldConfig } from "../../../types.js";
import { primaryKeyColumnType } from "../../../libs/db/kysely/column-helpers.js";
import buildTableName from "../helpers/build-table-name.js";

/**
 * Creates table schemas for fields
 * Handles document fields, brick fields, and repeater fields
 */
const createFieldTables = (props: {
	collection: CollectionBuilder;
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
	dbAdapter: AdapterType;
	type: Extract<TableType, "document-fields" | "brick" | "repeater">;
	documentTable: string;
	versionTable: string;
	brick?: string;
	repeaterKeys?: string[];
	parentTable?: string;
}): Awaited<
	ServiceResponse<{
		schema: CollectionSchemaTable;
		childTables: CollectionSchemaTable[];
	}>
> => {
	const tableNameRes = buildTableName(props.type, {
		collection: props.collection.key,
		brick: props.brick,
		repeater: props.repeaterKeys,
	});
	if (tableNameRes.error) return tableNameRes;

	const childTables: CollectionSchemaTable[] = [];
	const columns: CollectionSchemaColumn[] = [
		{
			key: "id",
			source: "core",
			dataType: primaryKeyColumnType(props.dbAdapter),
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
				table: props.documentTable,
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
				table: props.versionTable,
				column: "id",
				onDelete: "CASCADE",
			},
		},
		{
			key: "locale",
			source: "core",
			dataType: "text",
			nullable: false,
			foreignKey: {
				table: "lucid_locales",
				column: "code",
				onDelete: "CASCADE",
			},
		},
	];

	//* add repeater columns
	if (props.type === "repeater") {
		// add parent reference for repeater fields
		if (props.parentTable) {
			columns.push({
				key: "parent_id",
				source: "core",
				dataType: "integer",
				nullable: false,
				foreignKey: {
					table: props.parentTable,
					column: "id",
					onDelete: "CASCADE",
				},
			});
		}
		// add sorting for repeater items
		columns.push({
			key: "sort_order",
			source: "core",
			dataType: "integer",
			nullable: false,
			defaultValue: 0,
		});
	}

	//* process field columns
	for (const field of props.fields) {
		if (field.type === "repeater") {
			const repeaterKeys = (props.repeaterKeys || []).concat(field.key);

			const repeaterTableRes = createFieldTables({
				collection: props.collection,
				fields: field.fields,
				dbAdapter: props.dbAdapter,
				type: "repeater",
				documentTable: props.documentTable,
				versionTable: props.versionTable,
				brick: props.brick,
				repeaterKeys: repeaterKeys,
				parentTable: tableNameRes.data,
			});
			if (repeaterTableRes.error) return repeaterTableRes;

			childTables.push(repeaterTableRes.data.schema);
			childTables.push(...repeaterTableRes.data.childTables);
		} else {
			// TODO: default values, replacing field.type === "text" with call to field method to get corresponding type
			columns.push({
				key: field.key,
				source: "field",
				dataType: field.type === "text" ? "text" : "text", //* needs to call new dataType getter
				nullable: true,
			});
		}
	}

	return {
		data: {
			schema: {
				name: tableNameRes.data,
				type: props.type,
				key: {
					collection: props.collection.key,
					brick: props.brick,
					repeater: props.repeaterKeys,
				},
				columns: columns,
			},
			childTables: childTables,
		},
		error: undefined,
	};
};

export default createFieldTables;
