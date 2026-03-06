import type { FieldStaticConfig } from "../../types.js";

export const numberFieldConfig = {
	type: "number",
	database: {
		mode: "column",
	},
	validation: null,
} as const satisfies FieldStaticConfig<"number">;

export type NumberFieldType = typeof numberFieldConfig.type;
