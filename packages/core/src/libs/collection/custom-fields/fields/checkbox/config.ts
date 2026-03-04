import type { FieldStaticConfig } from "../../types.js";

export const checkboxFieldConfig = {
	type: "checkbox",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"checkbox">;

export type CheckboxFieldType = typeof checkboxFieldConfig.type;
