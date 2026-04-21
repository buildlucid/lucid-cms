import type { FieldDatabaseConfig } from "../types.js";
import type { TreeTableModeDefinition } from "./types.js";

export const treeTableSchemaColumns = {
	rootId: "brick_id",
	parentId: "parent_id",
	parentIdRef: "parent_id_ref",
} as const;

const TREE_TABLE_BASE_PRIORITY = 500;
const TREE_TABLE_DEPTH_PRIORITY = 10;

export const treeTableMode: TreeTableModeDefinition = {
	mode: "tree-table",
	baseTablePriority: TREE_TABLE_BASE_PRIORITY,
	isDatabaseConfig: (
		config,
	): config is Extract<
		FieldDatabaseConfig,
		{
			mode: "tree-table";
		}
	> => config.mode === "tree-table",
	/**
	 * Builds the core columns required for tree-table storage.
	 */
	getSchemaDefinition: (props) => {
		const hasParent = props.table.depth > 1;

		return {
			columns: [
				{
					name: treeTableSchemaColumns.rootId,
					type: props.db.getDataType("integer"),
					nullable: false,
					foreignKey: {
						table: props.table.root,
						column: "id",
						onDelete: "cascade",
					},
				},
				{
					name: treeTableSchemaColumns.parentId,
					type: props.db.getDataType("integer"),
					nullable: true,
					foreignKey:
						hasParent && props.table.parent !== props.table.root
							? {
									table: props.table.parent,
									column: "id",
									onDelete: "cascade",
								}
							: undefined,
				},
				{
					name: treeTableSchemaColumns.parentIdRef,
					type: props.db.getDataType("integer"),
					nullable: true,
				},
			],
		};
	},
	/**
	 * Reads nested child fields from a tree-table field config.
	 */
	getChildFieldConfigs: (field) => {
		if (!("fields" in field)) return null;
		if (!Array.isArray(field.fields)) return null;

		return field.fields;
	},
	/**
	 * Returns insertion priority based on tree depth in the current field path.
	 */
	getInsertPriority: (fieldPath) => fieldPath?.length ?? 0,
	/**
	 * Returns migration priority offset for a given tree depth.
	 */
	getPriorityOffsetForDepth: (depth) => depth * TREE_TABLE_DEPTH_PRIORITY,
	clientTypeGen: (props) => {
		const childFields = treeTableMode.getChildFieldConfigs(props.field) ?? [];
		const renderedChildFields = props.helpers.renderFieldMap(childFields, {
			builder: props.builder,
			collectionUsesTranslations: props.collectionUsesTranslations,
			withinGroup: true,
		});

		return {
			fieldType:
				props.fieldType ??
				props.helpers.renderBaseFieldType({
					field: props.field,
					mode: "groups",
					groupFieldsType: renderedChildFields.typeText,
					hasGroupRef: props.hasGroupRef,
				}),
			declarations: [
				...(props.declarations ?? []),
				...renderedChildFields.declarations,
			],
		};
	},
};
