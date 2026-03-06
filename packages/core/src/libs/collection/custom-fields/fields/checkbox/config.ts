import type { FieldStaticConfig } from "../../types.js";

export const checkboxFieldConfig = {
	type: "checkbox",
	database: {
		mode: "column",
	},
} as const satisfies FieldStaticConfig<"checkbox">;

export type CheckboxFieldType = typeof checkboxFieldConfig.type;
