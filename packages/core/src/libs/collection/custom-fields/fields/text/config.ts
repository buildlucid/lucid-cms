import type { FieldStaticConfig } from "../../types.js";

export const textFieldConfig = {
	type: "text",
	database: {
		mode: "column",
	},
} as const satisfies FieldStaticConfig<"text">;

export type TextFieldType = typeof textFieldConfig.type;
