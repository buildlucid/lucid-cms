import type { FieldStaticConfig } from "../../types.js";

export const linkFieldConfig = {
	type: "link",
	database: {
		mode: "column",
	},
} as const satisfies FieldStaticConfig<"link">;

export type LinkFieldType = typeof linkFieldConfig.type;
