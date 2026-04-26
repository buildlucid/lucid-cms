import type BrickBuilder from "../../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../../libs/collection/builders/collection-builder/index.js";
import type DatabaseAdapter from "../../../../libs/db/adapter-base.js";
import T from "../../../../translations/index.js";
import type {
	CFConfig,
	FieldTypes,
	ServiceResponse,
} from "../../../../types.js";
import registeredFields from "../../custom-fields/registered-fields.js";
import {
	getFieldDatabaseConfig,
	isCustomFieldTableType,
	isStorageMode,
	normalizeFieldDatabaseMode,
} from "../../custom-fields/storage/index.js";
import { relationTableMode } from "../../custom-fields/storage/relation-table.js";
import { treeTableMode } from "../../custom-fields/storage/tree-table.js";
import buildTableName from "../../helpers/build-table-name.js";
import prefixGeneratedColName from "../../helpers/prefix-generated-column-name.js";
import type {
	CollectionSchemaColumn,
	CollectionSchemaTable,
	TableType,
} from "../types.js";

/**
 * Creates table schemas for fields
 * Handles document fields, brick fields, and custom-field storage tables
 */
const createFieldTables = (props: {
	collection: CollectionBuilder;
	fields: CFConfig<FieldTypes>[];
	db: DatabaseAdapter;
	type: Exclude<TableType, "document" | "versions">;
	documentTable: string;
	versionTable: string;
	brick?: BrickBuilder;
	fieldPath?: string[];
	rootTable?: string;
	additionalCoreColumns?: CollectionSchemaColumn[];
}): Awaited<
	ServiceResponse<{
		schema: CollectionSchemaTable;
		childTables: CollectionSchemaTable[];
	}>
> => {
	const tableNameRes = buildTableName(
		props.type,
		{
			collection: props.collection.key,
			brick: props.brick?.key,
			fieldPath: props.fieldPath,
		},
		props.db.config.tableNameByteLimit,
	);
	if (tableNameRes.error) return tableNameRes;

	let includeIsOpen = true;
	if (isCustomFieldTableType(props.type)) {
		const databaseConfig = getFieldDatabaseConfig(props.type);
		if (databaseConfig && isStorageMode(databaseConfig, "relation-table")) {
			includeIsOpen = false;
		}
	}

	const childTables: CollectionSchemaTable[] = [];
	const columns: CollectionSchemaColumn[] = [
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
			name: "document_id",
			source: "core",
			type: props.db.getDataType("integer"),
			nullable: false,
			foreignKey: {
				table: props.documentTable,
				column: "id",
				onDelete: "cascade",
			},
		},
		{
			name: "document_version_id",
			source: "core",
			type: props.db.getDataType("integer"),
			nullable: false,
			foreignKey: {
				table: props.versionTable,
				column: "id",
				onDelete: "cascade",
			},
		},
		{
			name: "locale",
			source: "core",
			type: props.db.getDataType("text"),
			nullable: false,
			foreignKey: {
				table: "lucid_locales",
				column: "code",
				onDelete: "cascade",
			},
		},
		// used for tree-table groups position along with brick position
		{
			name: "position",
			source: "core",
			type: props.db.getDataType("integer"),
			nullable: false,
			default: 0,
		},
	];
	if (includeIsOpen) {
		columns.push({
			name: "is_open",
			source: "core",
			type: props.db.getDataType("boolean"),
			nullable: false,
			default: props.db.getDefault("boolean", "false"),
		});
	}

	//* bricks only
	if (props.type === "brick") {
		columns.push({
			name: "brick_type",
			source: "core",
			type: props.db.getDataType("text"),
			nullable: false,
		});
		// used to group a single instance of a brick accross locales instead of relying on the position value for this which isnt unique*
		columns.push({
			name: "brick_instance_id",
			source: "core",
			type: props.db.getDataType("text"),
			nullable: false,
		});
	}

	//* both brick table types
	if (props.type === "brick" || props.type === "document-fields") {
		// a temp reference ID for linking up with repeater temp brick_id values until insertion
		columns.push({
			name: "brick_id_ref",
			source: "core",
			type: props.db.getDataType("integer"),
			nullable: false,
		});
	}
	if (props.additionalCoreColumns) columns.push(...props.additionalCoreColumns);

	//* process field columns
	for (const field of props.fields) {
		const databaseConfig = registeredFields[field.type].config.database;
		const databaseMode = normalizeFieldDatabaseMode(databaseConfig.mode);

		switch (databaseMode) {
			case "ignore": {
				break;
			}
			case "tree-table": {
				if (!("tableType" in databaseConfig)) {
					return {
						data: undefined,
						error: {
							message: T("invalid_table_name_format_insufficient_parts"),
						},
					};
				}

				const treeTableChildFields = treeTableMode.getChildFieldConfigs(field);
				if (!treeTableChildFields) {
					return {
						data: undefined,
						error: {
							message: T("invalid_table_name_format_insufficient_parts"),
						},
					};
				}

				const fieldPath = (props.fieldPath || []).concat(field.key);
				const treeTableRoot = props.rootTable ?? tableNameRes.data.name;
				const treeTableCoreColumns = treeTableMode
					.getSchemaDefinition({
						db: props.db,
						table: {
							type: databaseConfig.tableType,
							parent: tableNameRes.data.name,
							root: treeTableRoot,
							depth: fieldPath.length,
						},
					})
					.columns.map((column) => ({
						name: column.name,
						source: "core",
						type: column.type,
						nullable: column.nullable,
						foreignKey: column.foreignKey,
						default: column.default,
					})) satisfies CollectionSchemaColumn[];

				const treeTableRes = createFieldTables({
					collection: props.collection,
					fields: treeTableChildFields,
					db: props.db,
					type: databaseConfig.tableType,
					documentTable: props.documentTable,
					versionTable: props.versionTable,
					brick: props.brick,
					fieldPath: fieldPath,
					rootTable: treeTableRoot,
					additionalCoreColumns: treeTableCoreColumns,
				});
				if (treeTableRes.error) return treeTableRes;

				childTables.push(treeTableRes.data.schema);
				childTables.push(...treeTableRes.data.childTables);
				break;
			}
			case "column": {
				//* field keys are unique within a collection, if we ever change them to be unique within a block (base layer and tree-table tables) we need to update this
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

				const fieldSchemaRes = fieldInstance.getSchemaDefinition({
					db: props.db,
					tables: {
						document: props.documentTable,
						version: props.versionTable,
					},
				});
				if (fieldSchemaRes.error) return fieldSchemaRes;

				for (const column of fieldSchemaRes.data.columns) {
					columns.push({
						name: prefixGeneratedColName(column.name),
						source: "field",
						canAutoRemove: false,
						type: column.type,
						nullable: column.nullable,
						foreignKey: column.foreignKey,
						customField: {
							type: field.type,
						},
						//* holding off on default value contraint on custom field columns due to sqlite/libsql adapters not supporting the alter column operation and instead having to drop+add the column again resulting in data loss.
						//* CF default values are a lot more likely to be edited than the others and in a way where a user wouldnt expect data loss - so until we have a solution here, no default contraints for CF exist
						default: props.db.supports("alterColumn") ? column.default : null,
					});
				}
				break;
			}
			case "relation-table": {
				if (!("tableType" in databaseConfig)) {
					return {
						data: undefined,
						error: {
							message: T("invalid_table_name_format_insufficient_parts"),
						},
					};
				}

				//* field keys are unique within a collection, if we ever change them to be unique within a block (base layer and tree-table tables) we need to update this
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

				const fieldSchemaRes = fieldInstance.getSchemaDefinition({
					db: props.db,
					tables: {
						document: props.documentTable,
						version: props.versionTable,
					},
				});
				if (fieldSchemaRes.error) return fieldSchemaRes;

				const relationFieldPath = relationTableMode.getTableFieldPath({
					fieldKey: field.key,
					fieldPath: props.fieldPath,
				});
				const relationCoreColumns = relationTableMode
					.getSchemaDefinition({
						db: props.db,
						table: {
							type: databaseConfig.tableType,
							parent: tableNameRes.data.name,
						},
					})
					.columns.map((column) => ({
						name: column.name,
						source: "core",
						type: column.type,
						nullable: column.nullable,
						foreignKey: column.foreignKey,
						default: column.default,
					})) satisfies CollectionSchemaColumn[];

				const relationTableRes = createFieldTables({
					collection: props.collection,
					fields: [],
					db: props.db,
					type: databaseConfig.tableType,
					documentTable: props.documentTable,
					versionTable: props.versionTable,
					brick: props.brick,
					fieldPath: relationFieldPath,
					additionalCoreColumns: relationCoreColumns,
				});
				if (relationTableRes.error) return relationTableRes;

				const relationFieldColumns = fieldSchemaRes.data.columns.map(
					(column) => ({
						name: prefixGeneratedColName(column.name),
						source: "field",
						canAutoRemove: false,
						type: column.type,
						nullable: column.nullable,
						foreignKey: column.foreignKey,
						customField: {
							type: field.type,
						},
						default: props.db.supports("alterColumn") ? column.default : null,
					}),
				) satisfies CollectionSchemaColumn[];

				relationTableRes.data.schema.columns.push(...relationFieldColumns);

				childTables.push(relationTableRes.data.schema);
				childTables.push(...relationTableRes.data.childTables);
				break;
			}
		}
	}

	return {
		data: {
			schema: {
				name: tableNameRes.data.name,
				rawName: tableNameRes.data.rawName,
				type: props.type,
				key: {
					collection: props.collection.key,
					brick: props.brick?.key,
					fieldPath: props.fieldPath,
				},
				columns: columns,
			},
			childTables: childTables,
		},
		error: undefined,
	};
};

export default createFieldTables;
