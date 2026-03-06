import type { FieldStaticConfig } from "../../types.js";

export const checkboxFieldConfig = {
	type: "checkbox",
	database: {
		mode: "column",
	},
	validation: null,
} as const satisfies FieldStaticConfig<"checkbox">;

export type CheckboxFieldType = typeof checkboxFieldConfig.type;
