import type { RelationTableModeDefinition } from "./types.js";

export const relationTableSchemaColumns = {
	parentId: "parent_id",
} as const;

export const relationTableMode: RelationTableModeDefinition = {
	mode: "relation-table",
	baseTablePriority: 300,
	getSchemaDefinition: (props) => {
		return {
			columns: [
				{
					name: relationTableSchemaColumns.parentId,
					type: props.db.getDataType("integer"),
					nullable: false,
					foreignKey: {
						table: props.table.parent,
						column: "id",
						onDelete: "cascade",
					},
				},
			],
		};
	},
	getTableFieldPath: (props) => {
		return [props.fieldKey];
	},
	clientTypeGen: (props) => ({
		fieldType:
			props.fieldType ??
			props.helpers.renderBaseFieldType({
				field: props.field,
				mode: props.fieldMode,
				valueType: props.valueType,
				hasGroupRef: props.hasGroupRef,
			}),
		declarations: props.declarations ?? [],
	}),
};
