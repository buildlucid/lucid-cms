import type { FieldStaticConfig } from "../../types.js";

export const tabFieldConfig = {
	type: "tab",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"tab">;

export type TabFieldType = typeof tabFieldConfig.type;
