import type { FieldStaticConfig } from "../../types.js";

export const selectFieldConfig = {
	type: "select",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: true,
		canBeLabel: true,
		canBeRichTextVariable: true,
		inlineText: false,
	},
} as const satisfies FieldStaticConfig<"select">;

export type SelectFieldType = typeof selectFieldConfig.type;
