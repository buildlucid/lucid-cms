import type { FieldStaticConfig } from "../../types.js";

export const richTextFieldConfig = {
	type: "rich-text",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"rich-text">;

export type RichTextFieldType = typeof richTextFieldConfig.type;
