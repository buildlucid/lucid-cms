import type { FieldStaticConfig } from "../../types.js";

export const textFieldConfig = {
	type: "text",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"text">;

export type TextFieldType = typeof textFieldConfig.type;
