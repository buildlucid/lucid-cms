import type { FieldStaticConfig } from "../../types.js";

export const codeFieldConfig = {
	type: "code",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: false,
	},
} as const satisfies FieldStaticConfig<"code">;

export type CodeFieldType = typeof codeFieldConfig.type;
