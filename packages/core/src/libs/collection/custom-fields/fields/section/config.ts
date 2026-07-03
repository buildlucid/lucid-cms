import type { FieldStaticConfig } from "../../types.js";

export const sectionFieldConfig = {
	type: "section",
	database: {
		mode: "ignore",
	},
} as const satisfies FieldStaticConfig<"section">;

export type SectionFieldType = typeof sectionFieldConfig.type;
