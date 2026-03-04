import type { FieldStaticConfig } from "../../types.js";

export const documentFieldConfig = {
	type: "document",
	relation: {
		separator: "doc",
		tableType: "document-rel",
	},
	refs: {
		fetchMode: "document-values",
	},
	validation: {
		mode: "document-by-collection",
	},
} as const satisfies FieldStaticConfig<"document">;

export type DocumentFieldType = typeof documentFieldConfig.type;
