import type { FieldStaticConfig } from "../../types.js";

export const documentFieldConfig = {
	type: "document",
	database: {
		mode: "column",
	},
	validation: {
		mode: "document-by-collection",
	},
} as const satisfies FieldStaticConfig<"document">;

export type DocumentFieldType = typeof documentFieldConfig.type;
