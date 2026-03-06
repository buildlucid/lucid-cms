import constants from "../../../../../constants/constants.js";
import type { FieldStaticConfig } from "../../types.js";

export const repeaterFieldConfig = {
	type: "repeater",
	database: {
		mode: "tree-table",
		separator: "rep",
		tableType: `${constants.db.customFieldTablePrefix}repeater`,
	},
} as const satisfies FieldStaticConfig<"repeater">;

export type RepeaterFieldType = typeof repeaterFieldConfig.type;
