import type { FieldStaticConfig } from "../../types.js";

export const selectFieldConfig = {
	type: "select",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"select">;

export type SelectFieldType = typeof selectFieldConfig.type;
