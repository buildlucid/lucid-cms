import type { FieldStaticConfig } from "../../types.js";

export const richTextFieldConfig = {
	type: "rich-text",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: false,
	},
} as const satisfies FieldStaticConfig<"rich-text">;

export type RichTextFieldType = typeof richTextFieldConfig.type;
