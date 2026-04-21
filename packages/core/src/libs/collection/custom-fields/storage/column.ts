import type { ColumnModeDefinition } from "./types.js";

export const columnMode: ColumnModeDefinition = {
	mode: "column",
	baseTablePriority: 0,
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
