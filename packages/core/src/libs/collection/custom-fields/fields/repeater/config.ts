import type { FieldStaticConfig } from "../../types.js";

export const repeaterFieldConfig = {
	type: "repeater",
	relation: {
		separator: "rep",
		tableType: "repeater",
	},
	refs: null,
	validation: null,
} as const satisfies FieldStaticConfig<"repeater">;

export type RepeaterFieldType = typeof repeaterFieldConfig.type;
