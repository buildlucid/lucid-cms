import type { FieldStaticConfig } from "../../types.js";

export const linkFieldConfig = {
	type: "link",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: false,
	},
} as const satisfies FieldStaticConfig<"link">;

export type LinkFieldType = typeof linkFieldConfig.type;
