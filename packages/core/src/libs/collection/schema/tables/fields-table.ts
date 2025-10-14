import type BrickBuilder from "../../../../libs/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../../libs/builders/collection-builder/index.js";
import type DatabaseAdapter from "../../../../libs/db-adapter/adapter-base.js";
import T from "../../../../translations/index.js";
import type {
	CFConfig,
	FieldTypes,
	ServiceResponse,
	TabFieldConfig,
} from "../../../../types.js";
import buildTableName from "../../helpers/build-table-name.js";
import prefixGeneratedColName from "../../helpers/prefix-generated-column-name.js";
import type {
	CollectionSchemaColumn,
	CollectionSchemaTable,
	TableType,
} from "../types.js";

/**
 * Creates table schemas for fields
 * Handles document fields, brick fields, and repeater fields
 */
const createFieldTables = (props: {
	collection: CollectionBuilder;
	fields: Exclude<CFConfig<FieldTypes>, TabFieldConfig>[];
	db: DatabaseAdapter;
	type: Extract<TableType, "document-fields" | "brick" | "repeater">;
	documentTable: string;
	versionTable: string;
	brick?: BrickBuilder;
	repeaterKeys?: string[];
	parentTable?: string;
	brickTable?: string;
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
		// used for repeater groups position along with brick position
		{
			name: "position",
			source: "core",
			type: props.db.getDataType("integer"),
			nullable: false,
			default: 0,
		},
		{
			name: "is_open",
			source: "core",
			type: props.db.getDataType("boolean"),
			nullable: false,
			default: props.db.getDefault("boolean", "false"),
		},
	];

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

	//* add repeater columns
	if (props.type === "repeater") {
		const brickTable =
			props.brickTable === undefined ? props.parentTable : props.brickTable;
		// add a parent reference to all repeaters that points to the top level parent which is always a 'brick' | 'document-fields' table
		columns.push({
			name: "brick_id",
			source: "core",
			type: props.db.getDataType("integer"),
			nullable: false,
			foreignKey: brickTable
				? {
						table: brickTable,
						column: "id",
						onDelete: "cascade",
					}
				: undefined,
		});

		const isNestedRepeater =
			props.repeaterKeys && props.repeaterKeys.length > 1;

		// add parent reference for repeater fields
		columns.push({
			name: "parent_id",
			source: "core",
			type: props.db.getDataType("integer"),
			nullable: true,
			foreignKey:
				isNestedRepeater &&
				props.parentTable &&
				props.parentTable !== brickTable
					? {
							table: props.parentTable,
							column: "id",
							onDelete: "cascade",
						}
					: undefined,
		});
		// add parent reference temp ID for insertion tracking
		columns.push({
			name: "parent_id_ref",
			source: "core",
			type: props.db.getDataType("integer"),
			nullable: true,
		});
	}

	//* process field columns
	for (const field of props.fields) {
		if (field.type === "repeater") {
			const repeaterKeys = (props.repeaterKeys || []).concat(field.key);

			const repeaterTableRes = createFieldTables({
				collection: props.collection,
				fields: field.fields,
				db: props.db,
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
