import type { FieldStaticConfig } from "../../types.js";

export const numberFieldConfig = {
	type: "number",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: true,
	},
} as const satisfies FieldStaticConfig<"number">;

export type NumberFieldType = typeof numberFieldConfig.type;
