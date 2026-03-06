import type { FieldStaticConfig } from "../../types.js";

export const colorFieldConfig = {
	type: "color",
	database: {
		mode: "column",
	},
	validation: null,
} as const satisfies FieldStaticConfig<"color">;

export type ColorFieldType = typeof colorFieldConfig.type;
