import type { FieldStaticConfig } from "../../types.js";

export const textFieldConfig = {
	type: "text",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: true,
	},
} as const satisfies FieldStaticConfig<"text">;

export type TextFieldType = typeof textFieldConfig.type;
