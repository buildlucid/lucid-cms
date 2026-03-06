import type { FieldStaticConfig } from "../../types.js";

export const selectFieldConfig = {
	type: "select",
	database: {
		mode: "column",
	},
	validation: null,
} as const satisfies FieldStaticConfig<"select">;

export type SelectFieldType = typeof selectFieldConfig.type;
