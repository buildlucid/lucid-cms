import type { FieldStaticConfig } from "../../types.js";

export const sectionFieldConfig = {
	type: "section",
	database: {
		mode: "ignore",
	},
	capabilities: {
		filterable: false,
		sortable: false,
		canBeLabel: false,
		canBeRichTextVariable: false,
	},
} as const satisfies FieldStaticConfig<"section">;

export type SectionFieldType = typeof sectionFieldConfig.type;
