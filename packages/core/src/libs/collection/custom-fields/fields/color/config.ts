import type { FieldStaticConfig } from "../../types.js";

export const colorFieldConfig = {
	type: "color",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: false,
	},
} as const satisfies FieldStaticConfig<"color">;

export type ColorFieldType = typeof colorFieldConfig.type;
