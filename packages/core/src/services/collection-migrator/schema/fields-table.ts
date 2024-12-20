import T from "../../../translations/index.js";
import { primaryKeyColumnType } from "../../../libs/db/kysely/column-helpers.js";
import buildTableName from "../helpers/build-table-name.js";
import type {
	CollectionSchemaTable,
	CollectionSchemaColumn,
	TableType,
} from "./types.js";
import type { ServiceResponse } from "../../../types.js";
import type { CollectionBuilder } from "../../../builders.js";
import type { AdapterType } from "../../../libs/db/types.js";
import type { CFConfig, FieldTypes, TabFieldConfig } from "../../../types.js";
import type { BrickBuilder } from "../../../builders.js";

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
	brick?: BrickBuilder;
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
		brick: props.brick?.key,
		repeater: props.repeaterKeys,
	});
	if (tableNameRes.error) return tableNameRes;

	const childTables: CollectionSchemaTable[] = [];
	const columns: CollectionSchemaColumn[] = [
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
				table: props.documentTable,
				column: "id",
				onDelete: "CASCADE",
			},
		},
		{
			name: "document_version_id",
			source: "core",
			type: "integer",
			nullable: false,
			foreignKey: {
				table: props.versionTable,
				column: "id",
				onDelete: "CASCADE",
			},
		},
		{
			name: "locale",
			source: "core",
			type: "text",
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
				name: "parent_id",
				source: "core",
				type: "integer",
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
			name: "sort_order",
			source: "core",
			type: "integer",
			nullable: false,
			default: 0,
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
			//* field keys are unique within a collection, if we ever change them to be unique within a block (base layer and repeaters) we need to update this
			const fieldInstance = (props.brick || props.collection).fields.get(
				field.key,
			);
			if (!fieldInstance) {
				return {
					data: undefined,
					error: {
						message: T("cannot_find_field_with_key_in_collection_brick", {
							key: field.key,
							type: props.brick ? "brick" : "collection",
							typeKey: props.brick ? props.brick.key : props.collection.key,
						}),
					},
				};
			}

			const fieldSchema = fieldInstance.getSchemaDefinition({
				adapterType: props.dbAdapter,
				tables: {
					document: props.documentTable,
					version: props.versionTable,
				},
			});

			for (const column of fieldSchema.columns) {
				columns.push({
					name: column.name,
					source: "field",
					type: column.type,
					nullable: column.nullable,
					foreignKey: column.foreignKey,
				});
			}
		}
	}

	return {
		data: {
			schema: {
				name: tableNameRes.data,
				type: props.type,
				key: {
					collection: props.collection.key,
					brick: props.brick?.key,
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
