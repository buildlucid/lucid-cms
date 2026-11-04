import type { FieldStaticConfig } from "../../types.js";

export const datetimeFieldConfig = {
	type: "datetime",
	database: {
		mode: "column",
	},
	capabilities: {
		filterable: true,
		sortable: true,
		canBeLabel: true,
		canBeRichTextVariable: true,
		inlineText: false,
	},
} as const satisfies FieldStaticConfig<"datetime">;

export type DatetimeFieldType = typeof datetimeFieldConfig.type;
