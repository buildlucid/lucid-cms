import type { FieldStaticConfig } from "../../types.js";

export const datetimeFieldConfig = {
	type: "datetime",
	database: {
		mode: "column",
	},
} as const satisfies FieldStaticConfig<"datetime">;

export type DatetimeFieldType = typeof datetimeFieldConfig.type;
