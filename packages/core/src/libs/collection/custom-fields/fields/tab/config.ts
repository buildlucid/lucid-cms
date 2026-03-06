import type { FieldStaticConfig } from "../../types.js";

export const tabFieldConfig = {
	type: "tab",
	database: {
		mode: "column",
	},
	validation: null,
} as const satisfies FieldStaticConfig<"tab">;

export type TabFieldType = typeof tabFieldConfig.type;
