import constants from "../../../../../constants/constants.js";
import type { FieldStaticConfig } from "../../types.js";

export const rangeFieldConfig = {
	type: "range",
	database: {
		mode: "relation-table",
		separator: "rng",
		tableType: `${constants.db.customFieldTablePrefix}range`,
	},
	capabilities: {
		filterable: true,
		sortable: false,
	},
} as const satisfies FieldStaticConfig<"range">;

export type RangeFieldType = typeof rangeFieldConfig.type;
