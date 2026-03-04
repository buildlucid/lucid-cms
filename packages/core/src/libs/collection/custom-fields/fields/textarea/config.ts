import type { FieldStaticConfig } from "../../types.js";

export const textareaFieldConfig = {
	type: "textarea",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"textarea">;

export type TextareaFieldType = typeof textareaFieldConfig.type;
