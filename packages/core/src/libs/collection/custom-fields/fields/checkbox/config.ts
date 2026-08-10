import type { FieldStaticConfig } from "../../types.js";

export const checkboxFieldConfig = {
	type: "checkbox",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: true,
		canBeLabel: false,
		canBeRichTextVariable: true,
	},
} as const satisfies FieldStaticConfig<"checkbox">;

export type CheckboxFieldType = typeof checkboxFieldConfig.type;
