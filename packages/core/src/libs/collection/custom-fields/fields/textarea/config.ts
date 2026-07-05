import type { FieldStaticConfig } from "../../types.js";

export const textareaFieldConfig = {
	type: "textarea",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: true,
	},
} as const satisfies FieldStaticConfig<"textarea">;

export type TextareaFieldType = typeof textareaFieldConfig.type;
