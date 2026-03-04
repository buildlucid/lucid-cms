import type { FieldStaticConfig } from "../../types.js";

export const datetimeFieldConfig = {
	type: "datetime",
	relation: null,
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"datetime">;

export type DatetimeFieldType = typeof datetimeFieldConfig.type;
